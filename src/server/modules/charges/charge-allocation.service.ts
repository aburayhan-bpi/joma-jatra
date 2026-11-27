import {
  ChargeAllocationMode,
  ChargeAllocationSource,
  TransferFeeBearerType,
} from "@/types/backend";
import mongoose from "mongoose";
import { badRequest, notFound } from "../../core/app-error";
import {
  computeProRataChargeAllocations,
  getMemberBalance,
  getMemberBalancesMap,
} from "../../shared/accounting.service";
import { safeSendEmail } from "../../shared/email";
import { buildChargeAllocationEmail } from "../../shared/email-templates";
import { roundMoney, toObjectId } from "../../shared/normalize";
import { DepositReturnModel } from "../returns/deposit-return.model";
import { UserModel } from "../members/user.model";
import { ChargeAllocationModel } from "./charge-allocation.model";

export interface PreparedAllocation {
  memberId: mongoose.Types.ObjectId;
  memberName: string;
  memberEmail: string;
  allocationMode: ChargeAllocationMode;
  memberBalanceSnapshot: number;
  eligibleTotalSnapshot: number;
  sharePercent: number;
  allocatedAmount: number;
}

/**
 * Resolves and validates member charge allocations before a Charge or Transfer is persisted.
 * Strictly protects Donated/Waived Reserve and NEVER allocates shared charges onto inactive/former members.
 */
export async function prepareChargeAllocations(params: {
  chargeAmount: number;
  bearerType?: TransferFeeBearerType;
  specificMemberId?: string;
}): Promise<PreparedAllocation[]> {
  const chargeAmount = roundMoney(params.chargeAmount);
  if (chargeAmount <= 0) return [];

  if (params.bearerType === "SPECIFIC_MEMBER") {
    if (!params.specificMemberId) {
      throw badRequest("Please select the member who bears this transfer fee.");
    }
    const targetMember = await UserModel.findById(
      toObjectId(params.specificMemberId, "feeBearerMemberId"),
    )
      .select("name email status isDeleted")
      .lean();
    if (!targetMember) {
      throw notFound("Selected fee-bearing member not found.");
    }

    const memberBalance = await getMemberBalance(targetMember._id);
    if (memberBalance.netBalance < chargeAmount) {
      throw badRequest(
        `${targetMember.name}'s current net balance is ৳${memberBalance.netBalance}, which is less than the ৳${chargeAmount} transfer fee.`,
      );
    }

    return [
      {
        memberId: targetMember._id,
        memberName: targetMember.name,
        memberEmail: targetMember.email,
        allocationMode: "DIRECT_MEMBER",
        memberBalanceSnapshot: memberBalance.netBalance,
        eligibleTotalSnapshot: memberBalance.netBalance,
        sharePercent: 100,
        allocatedAmount: chargeAmount,
      },
    ];
  }

  // Default: SHARED_PRO_RATA across ACTIVE members with positive netBalance ONLY
  const activeUsers = await UserModel.find({
    status: "ACTIVE",
    isDeleted: false,
  })
    .select("_id name email")
    .lean();

  const activeIds = activeUsers.map((u) => u._id);
  const balancesMap =
    activeIds.length > 0 ? await getMemberBalancesMap(activeIds) : new Map();

  const eligiblePool = activeUsers
    .map((u) => {
      const bal = balancesMap.get(u._id.toString())?.netBalance || 0;
      return {
        user: u,
        balance: roundMoney(bal),
      };
    })
    .filter((item) => item.balance > 0);

  const totalActiveBalance = roundMoney(
    eligiblePool.reduce((sum, item) => sum + item.balance, 0),
  );

  if (totalActiveBalance < chargeAmount) {
    throw badRequest(
      `Cannot record ৳${chargeAmount} charge: active members' combined net balance is ৳${totalActiveBalance}. Former members' balances and Donated Reserve are strictly protected. Record an active deposit or cover this offline first.`,
    );
  }

  const proRata = computeProRataChargeAllocations(
    chargeAmount,
    eligiblePool.map((e) => ({
      memberId: e.user._id.toString(),
      balance: e.balance,
    })),
  );

  if (proRata.length === 0) {
    throw badRequest(
      "Could not allocate charge across active members. Verify active member balances.",
    );
  }

  const userById = new Map(eligiblePool.map((e) => [e.user._id.toString(), e.user]));

  return proRata.map((item) => {
    const u = userById.get(item.memberId)!;
    return {
      memberId: u._id,
      memberName: u.name,
      memberEmail: u.email,
      allocationMode: "PRO_RATA_ACTIVE",
      memberBalanceSnapshot: item.memberBalanceSnapshot,
      eligibleTotalSnapshot: item.eligibleTotalSnapshot,
      sharePercent: item.sharePercent,
      allocatedAmount: item.allocatedAmount,
    };
  });
}

/**
 * Persists prepared ChargeAllocation rows and emails affected members non-blockingly.
 */
export async function persistChargeAllocationsAndNotify(params: {
  sourceType: ChargeAllocationSource;
  sourceId: mongoose.Types.ObjectId;
  title: string;
  chargeDate: Date;
  totalChargeAmount: number;
  recordedByName: string;
  allocations: PreparedAllocation[];
}) {
  if (params.allocations.length === 0) return;

  await ChargeAllocationModel.insertMany(
    params.allocations.map((alloc) => ({
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      memberId: alloc.memberId,
      allocationMode: alloc.allocationMode,
      title: params.title,
      chargeDate: params.chargeDate,
      totalChargeAmount: roundMoney(params.totalChargeAmount),
      memberBalanceSnapshot: alloc.memberBalanceSnapshot,
      eligibleTotalSnapshot: alloc.eligibleTotalSnapshot,
      sharePercent: alloc.sharePercent,
      allocatedAmount: alloc.allocatedAmount,
    })),
  );

  // Send individualized charge breakdown receipts with updated net balances
  await Promise.all(
    params.allocations
      .filter((a) => Boolean(a.memberEmail))
      .map(async (alloc) => {
        const newNetBalance = roundMoney(
          Math.max(0, alloc.memberBalanceSnapshot - alloc.allocatedAmount),
        );
        await safeSendEmail({
          to: alloc.memberEmail,
          ...buildChargeAllocationEmail({
            memberName: alloc.memberName,
            sourceType: params.sourceType,
            allocationMode: alloc.allocationMode,
            title: params.title,
            chargeDate: params.chargeDate,
            totalChargeAmount: roundMoney(params.totalChargeAmount),
            allocatedAmount: alloc.allocatedAmount,
            sharePercent: alloc.sharePercent,
            memberBalanceSnapshot: alloc.memberBalanceSnapshot,
            eligibleTotalSnapshot: alloc.eligibleTotalSnapshot,
            recordedByName: params.recordedByName,
            newNetBalance,
          }),
        });
      }),
  );
}

/**
 * Soft-deletes all ChargeAllocations linked to a Charge or Transfer.
 */
export async function softDeleteAllocationsForSource(
  actorId: string,
  sourceType: ChargeAllocationSource,
  sourceId: mongoose.Types.ObjectId,
) {
  await ChargeAllocationModel.updateMany(
    { sourceType, sourceId, isDeleted: false },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: toObjectId(actorId, "actorId"),
      },
    },
  );
}

/**
 * Validates and restores soft-deleted ChargeAllocations linked to a Charge or Transfer.
 * Blocks if restoring would push any member's balance negative or violate pending return requests.
 */
export async function restoreAllocationsForSource(
  sourceType: ChargeAllocationSource,
  sourceId: mongoose.Types.ObjectId,
) {
  const deletedAllocs = await ChargeAllocationModel.find({
    sourceType,
    sourceId,
    isDeleted: true,
  }).lean();

  if (deletedAllocs.length === 0) return;

  const memberIds = deletedAllocs.map((a) => a.memberId);
  const [members, balancesMap, pendingReturnsAgg] = await Promise.all([
    UserModel.find({ _id: { $in: memberIds } })
      .select("name status isDeleted")
      .lean(),
    getMemberBalancesMap(memberIds),
    DepositReturnModel.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      {
        $match: {
          memberId: { $in: memberIds },
          status: "PENDING",
          isDeleted: false,
        },
      },
      { $group: { _id: "$memberId", total: { $sum: "$amount" } } },
    ]),
  ]);

  const memberMap = new Map(members.map((m) => [m._id.toString(), m]));
  const pendingMap = new Map(
    pendingReturnsAgg.map((r) => [r._id.toString(), roundMoney(r.total)]),
  );

  for (const alloc of deletedAllocs) {
    const idStr = alloc.memberId.toString();
    const member = memberMap.get(idStr);
    const name = member?.name || "Member";

    if (
      alloc.allocationMode === "PRO_RATA_ACTIVE" &&
      (!member || member.isDeleted || member.status !== "ACTIVE")
    ) {
      throw badRequest(
        `Cannot restore: ${name} has since left or been deactivated, so this shared charge can no longer be re-applied.`,
      );
    }

    const netBal = balancesMap.get(idStr)?.netBalance || 0;
    const pendingRet = pendingMap.get(idStr) || 0;
    const available = roundMoney(netBal - pendingRet);

    if (available < alloc.allocatedAmount) {
      throw badRequest(
        `Cannot restore: ${name}'s available balance is ৳${available} (after pending returns), which is less than their ৳${alloc.allocatedAmount} share.`,
      );
    }
  }

  await ChargeAllocationModel.updateMany(
    { sourceType, sourceId, isDeleted: true },
    {
      $set: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      },
    },
  );
}

/**
 * Loads active or trashed ChargeAllocations grouped by sourceId for listing UIs.
 */
export async function getAllocationsMapBySourceIds(
  sourceType: ChargeAllocationSource,
  sourceIds: mongoose.Types.ObjectId[],
  onlyDeleted = false,
) {
  if (sourceIds.length === 0) return new Map<string, unknown[]>();

  const rows = await ChargeAllocationModel.find({
    sourceType,
    sourceId: { $in: sourceIds },
    isDeleted: onlyDeleted,
  })
    .populate("memberId", "name email role status isDeleted")
    .sort({ allocatedAmount: -1 })
    .lean();

  const map = new Map<string, unknown[]>();
  for (const r of rows) {
    const key = r.sourceId.toString();
    const list = map.get(key) || [];
    list.push({ ...r, id: r._id.toString() });
    map.set(key, list);
  }
  return map;
}
