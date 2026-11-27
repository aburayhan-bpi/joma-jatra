import mongoose from "mongoose";
import { AccountChargeModel } from "../modules/charges/account-charge.model";
import { ChargeAllocationModel } from "../modules/charges/charge-allocation.model";
import { DepositModel } from "../modules/deposits/deposit.model";
import { UserModel } from "../modules/members/user.model";
import { PaymentAccountModel } from "../modules/payment-accounts/payment-account.model";
import { DepositReturnModel } from "../modules/returns/deposit-return.model";
import { AccountTransferModel } from "../modules/transfers/account-transfer.model";
import { roundMoney, toObjectId } from "./normalize";

export interface MemberBalanceSummary {
  totalDeposited: number;
  totalReturned: number;
  totalDonatedWaived: number;
  totalCharges: number;
  netBalance: number;
  pendingDepositsCount: number;
  pendingReturnsCount: number;
}

export interface AccountBalanceSummary {
  accountId: string;
  totalInDeposits: number;
  totalOutReturns: number;
  totalTransferIn: number;
  totalTransferOut: number;
  totalTransferFees: number;
  totalStandaloneCharges: number;
  balance: number;
}

export interface GroupFundSummary {
  totalApprovedDeposits: number;
  totalApprovedPayoutReturns: number;
  totalDonatedWaivers: number;
  totalTransferFees: number;
  totalStandaloneCharges: number;
  totalCharges: number;
  totalAllocatedMemberCharges?: number;
  unallocatedLegacyCharges?: number;
  totalCashInHand: number;
  unsettledFormerMemberPayable: number;
  activeNetFund: number;
  activeMemberBalancesSum?: number;
  accountBalancesSum: number;
  reconciliationDifference: number;
  memberLedgerDifference?: number;
}

export interface ProRataMemberAllocation {
  memberId: string;
  memberBalanceSnapshot: number;
  eligibleTotalSnapshot: number;
  sharePercent: number;
  allocatedAmount: number;
}

/**
 * Splits a charge pro-rata by member balance using exact integer-paisa Largest Remainder (Hamilton) allocation.
 * Guarantees sum(allocatedAmount) === roundMoney(chargeAmount) and each allocation <= member balance with zero float drift.
 */
export function computeProRataChargeAllocations(
  chargeAmount: number,
  eligibleMembers: { memberId: string; balance: number }[],
): ProRataMemberAllocation[] {
  const totalCharge = roundMoney(chargeAmount);
  const totalChargePaisa = Math.round(totalCharge * 100);
  if (totalChargePaisa <= 0) return [];

  const positiveMembers = eligibleMembers
    .map((m) => {
      const bal = roundMoney(m.balance);
      return {
        memberId: m.memberId,
        balance: bal,
        balancePaisa: Math.round(bal * 100),
      };
    })
    .filter((m) => m.balancePaisa > 0);

  const eligibleTotalPaisa = positiveMembers.reduce(
    (sum, m) => sum + m.balancePaisa,
    0,
  );
  if (positiveMembers.length === 0 || eligibleTotalPaisa < totalChargePaisa) {
    return [];
  }

  const eligibleTotal = roundMoney(eligibleTotalPaisa / 100);
  const scored = positiveMembers.map((m) => {
    // Use integer product (Number.MAX_SAFE_INTEGER supports up to ৳900 crore * ৳900 crore safely, or BigInt for huge totals)
    const exactNum = m.balancePaisa * totalChargePaisa;
    const floorPaisa = Math.floor(exactNum / eligibleTotalPaisa);
    const remainderNum = exactNum % eligibleTotalPaisa;
    return {
      memberId: m.memberId,
      balance: m.balance,
      balancePaisa: m.balancePaisa,
      floorPaisa,
      remainderNum,
      sharePercent: roundMoney((m.balancePaisa / eligibleTotalPaisa) * 100),
    };
  });

  const floorSum = scored.reduce((sum, s) => sum + s.floorPaisa, 0);
  let leftoverPaisa = totalChargePaisa - floorSum;

  const rankedIndices = scored
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => {
      if (b.item.remainderNum !== a.item.remainderNum) {
        return b.item.remainderNum - a.item.remainderNum;
      }
      if (b.item.balancePaisa !== a.item.balancePaisa) {
        return b.item.balancePaisa - a.item.balancePaisa;
      }
      return a.item.memberId.localeCompare(b.item.memberId);
    });

  const bonusSet = new Set<number>();
  for (const { item, idx } of rankedIndices) {
    if (leftoverPaisa <= 0) break;
    // Never allow a rounding bonus to exceed a member's own balance
    if (item.floorPaisa + 1 <= item.balancePaisa) {
      bonusSet.add(idx);
      leftoverPaisa -= 1;
    }
  }

  return scored
    .map((s, idx) => {
      const paisa = s.floorPaisa + (bonusSet.has(idx) ? 1 : 0);
      return {
        memberId: s.memberId,
        memberBalanceSnapshot: s.balance,
        eligibleTotalSnapshot: eligibleTotal,
        sharePercent: s.sharePercent,
        allocatedAmount: roundMoney(paisa / 100),
      };
    })
    .filter((entry) => entry.allocatedAmount > 0);
}

/**
 * Pure helper to calculate group fund reconciliation figures (unit-testable).
 */
export function computeFundReconciliation(params: {
  totalApprovedDeposits: number;
  totalApprovedPayoutReturns: number;
  totalTransferFees: number;
  totalStandaloneCharges: number;
  unsettledFormerMemberPayable: number;
  accountBalancesSum: number;
}) {
  const totalCharges = roundMoney(
    params.totalTransferFees + params.totalStandaloneCharges,
  );
  const totalCashInHand = roundMoney(
    params.totalApprovedDeposits -
      params.totalApprovedPayoutReturns -
      totalCharges,
  );
  const activeNetFund = roundMoney(
    totalCashInHand - params.unsettledFormerMemberPayable,
  );
  const reconciliationDifference = roundMoney(
    totalCashInHand - params.accountBalancesSum,
  );

  return {
    totalCharges,
    totalCashInHand,
    activeNetFund,
    reconciliationDifference,
  };
}

/**
 * Pure helper to calculate a single payment account balance (unit-testable).
 */
export function computeSingleAccountBalance(params: {
  totalInDeposits: number;
  totalOutReturns: number;
  totalTransferIn: number;
  totalTransferOut: number;
  totalTransferFees: number;
  totalStandaloneCharges: number;
}): number {
  return roundMoney(
    params.totalInDeposits +
      params.totalTransferIn -
      params.totalOutReturns -
      params.totalTransferOut -
      params.totalTransferFees -
      params.totalStandaloneCharges,
  );
}

/**
 * Pure helper for net cash sent to a member on a return after deducting payout fee.
 */
export function computeReturnNetPayout(
  grossAmount: number,
  payoutFee = 0,
): number {
  return roundMoney(Math.max(0, grossAmount - Math.max(0, payoutFee)));
}

/**
 * Pure validator for payout fee invariants across returns and settlement payouts.
 * Returns null if valid, otherwise a clear error message.
 */
export function validateReturnPayoutFee(
  grossAmount: number,
  payoutFee = 0,
  returnType?: string,
): string | null {
  if (payoutFee < 0) {
    return "Payout fee cannot be negative.";
  }
  if (returnType === "DONATED_WAIVER" && payoutFee > 0) {
    return "Donated/waived records cannot have a payout fee.";
  }
  if (payoutFee >= grossAmount) {
    return `Payout fee (৳${payoutFee}) must be less than the return amount (৳${grossAmount}) so a positive net payout reaches the member.`;
  }
  return null;
}

/**
 * Pure helper for private personal monthly goal progress.
 * Caps progress by the member's verified netBalance so returned/waived funds do not inflate goal completion.
 */
export function computePersonalGoalProgress(params: {
  currentMonthDeposited: number;
  netBalance: number;
  personalMonthlyGoal: number;
}) {
  const goal = roundMoney(Math.max(0, params.personalMonthlyGoal));
  const achievedAmount = roundMoney(
    Math.max(0, Math.min(params.currentMonthDeposited, params.netBalance)),
  );
  const remainingAmount = roundMoney(Math.max(0, goal - achievedAmount));
  const progressPercent =
    goal > 0 ? Math.round((achievedAmount / goal) * 100) : 0;

  return {
    achievedAmount,
    remainingAmount,
    progressPercent,
  };
}

/**
 * Computes live financial summary for a single member from approved non-deleted records.
 */
export async function getMemberBalance(
  memberId: string | mongoose.Types.ObjectId,
): Promise<MemberBalanceSummary> {
  const objectId =
    typeof memberId === "string" ? toObjectId(memberId, "memberId") : memberId;

  const [
    depositAgg,
    returnAgg,
    chargeAgg,
    pendingDepositsCount,
    pendingReturnsCount,
  ] = await Promise.all([
    DepositModel.aggregate<{ _id: null; total: number }>([
      {
        $match: {
          memberId: objectId,
          status: "APPROVED",
          isDeleted: false,
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    DepositReturnModel.aggregate<{ _id: string; total: number }>([
      {
        $match: {
          memberId: objectId,
          status: "APPROVED",
          isDeleted: false,
        },
      },
      { $group: { _id: "$returnType", total: { $sum: "$amount" } } },
    ]),
    ChargeAllocationModel.aggregate<{ _id: null; total: number }>([
      {
        $match: {
          memberId: objectId,
          isDeleted: false,
        },
      },
      { $group: { _id: null, total: { $sum: "$allocatedAmount" } } },
    ]),
    DepositModel.countDocuments({
      memberId: objectId,
      status: "PENDING",
      isDeleted: false,
    }),
    DepositReturnModel.countDocuments({
      memberId: objectId,
      status: "PENDING",
      isDeleted: false,
    }),
  ]);

  const totalDeposited = roundMoney(depositAgg[0]?.total || 0);
  let totalReturned = 0;
  let totalDonatedWaived = 0;

  for (const row of returnAgg) {
    totalReturned += row.total;
    if (row._id === "DONATED_WAIVER") {
      totalDonatedWaived += row.total;
    }
  }

  totalReturned = roundMoney(totalReturned);
  totalDonatedWaived = roundMoney(totalDonatedWaived);
  const totalCharges = roundMoney(chargeAgg[0]?.total || 0);
  const netBalance = roundMoney(totalDeposited - totalReturned - totalCharges);

  return {
    totalDeposited,
    totalReturned,
    totalDonatedWaived,
    totalCharges,
    netBalance,
    pendingDepositsCount,
    pendingReturnsCount,
  };
}

/**
 * Computes balances for a list of member IDs in a single batched aggregation query.
 */
export async function getMemberBalancesMap(
  memberIds?: mongoose.Types.ObjectId[],
): Promise<Map<string, MemberBalanceSummary>> {
  const memberMatch =
    memberIds && memberIds.length > 0 ? { memberId: { $in: memberIds } } : {};

  const [deposits, returns, charges, pendingDep, pendingRet] =
    await Promise.all([
      DepositModel.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
        { $match: { ...memberMatch, status: "APPROVED", isDeleted: false } },
        { $group: { _id: "$memberId", total: { $sum: "$amount" } } },
      ]),
      DepositReturnModel.aggregate<{
        _id: { memberId: mongoose.Types.ObjectId; returnType: string };
        total: number;
      }>([
        { $match: { ...memberMatch, status: "APPROVED", isDeleted: false } },
        {
          $group: {
            _id: { memberId: "$memberId", returnType: "$returnType" },
            total: { $sum: "$amount" },
          },
        },
      ]),
      ChargeAllocationModel.aggregate<{
        _id: mongoose.Types.ObjectId;
        total: number;
      }>([
        { $match: { ...memberMatch, isDeleted: false } },
        {
          $group: {
            _id: "$memberId",
            total: { $sum: "$allocatedAmount" },
          },
        },
      ]),
      DepositModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
        { $match: { ...memberMatch, status: "PENDING", isDeleted: false } },
        { $group: { _id: "$memberId", count: { $sum: 1 } } },
      ]),
      DepositReturnModel.aggregate<{
        _id: mongoose.Types.ObjectId;
        count: number;
      }>([
        { $match: { ...memberMatch, status: "PENDING", isDeleted: false } },
        { $group: { _id: "$memberId", count: { $sum: 1 } } },
      ]),
    ]);

  const map = new Map<string, MemberBalanceSummary>();

  const ensureEntry = (id: string) => {
    let entry = map.get(id);
    if (!entry) {
      entry = {
        totalDeposited: 0,
        totalReturned: 0,
        totalDonatedWaived: 0,
        totalCharges: 0,
        netBalance: 0,
        pendingDepositsCount: 0,
        pendingReturnsCount: 0,
      };
      map.set(id, entry);
    }
    return entry;
  };

  for (const row of deposits) {
    ensureEntry(row._id.toString()).totalDeposited = roundMoney(row.total);
  }

  for (const row of returns) {
    const entry = ensureEntry(row._id.memberId.toString());
    entry.totalReturned = roundMoney(entry.totalReturned + row.total);
    if (row._id.returnType === "DONATED_WAIVER") {
      entry.totalDonatedWaived = roundMoney(
        entry.totalDonatedWaived + row.total,
      );
    }
  }

  for (const row of charges) {
    ensureEntry(row._id.toString()).totalCharges = roundMoney(row.total);
  }

  for (const row of pendingDep) {
    ensureEntry(row._id.toString()).pendingDepositsCount = row.count;
  }

  for (const row of pendingRet) {
    ensureEntry(row._id.toString()).pendingReturnsCount = row.count;
  }

  for (const entry of map.values()) {
    entry.netBalance = roundMoney(
      entry.totalDeposited - entry.totalReturned - entry.totalCharges,
    );
  }

  return map;
}

/**
 * Computes live balances for all payment accounts (including soft-deleted accounts that still have historical transactions).
 */
export async function getAllAccountBalances(): Promise<
  Map<string, AccountBalanceSummary>
> {
  const [depAgg, retAgg, transferInAgg, transferOutAgg, chargeAgg] =
    await Promise.all([
      DepositModel.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
        { $match: { status: "APPROVED", isDeleted: false } },
        { $group: { _id: "$paymentAccountId", total: { $sum: "$amount" } } },
      ]),
      DepositReturnModel.aggregate<{
        _id: mongoose.Types.ObjectId;
        total: number;
      }>([
        {
          $match: {
            status: "APPROVED",
            isDeleted: false,
            returnType: { $ne: "DONATED_WAIVER" },
            paymentAccountId: { $ne: null },
          },
        },
        { $group: { _id: "$paymentAccountId", total: { $sum: "$amount" } } },
      ]),
      AccountTransferModel.aggregate<{
        _id: mongoose.Types.ObjectId;
        total: number;
      }>([
        { $match: { isDeleted: false } },
        { $group: { _id: "$toAccountId", total: { $sum: "$amount" } } },
      ]),
      AccountTransferModel.aggregate<{
        _id: mongoose.Types.ObjectId;
        totalAmount: number;
        totalFee: number;
      }>([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: "$fromAccountId",
            totalAmount: { $sum: "$amount" },
            totalFee: { $sum: "$transferFee" },
          },
        },
      ]),
      AccountChargeModel.aggregate<{
        _id: mongoose.Types.ObjectId;
        total: number;
      }>([
        { $match: { isDeleted: false } },
        { $group: { _id: "$paymentAccountId", total: { $sum: "$amount" } } },
      ]),
    ]);

  const map = new Map<string, AccountBalanceSummary>();
  const ensure = (id: string) => {
    let entry = map.get(id);
    if (!entry) {
      entry = {
        accountId: id,
        totalInDeposits: 0,
        totalOutReturns: 0,
        totalTransferIn: 0,
        totalTransferOut: 0,
        totalTransferFees: 0,
        totalStandaloneCharges: 0,
        balance: 0,
      };
      map.set(id, entry);
    }
    return entry;
  };

  for (const row of depAgg) {
    if (row._id) ensure(row._id.toString()).totalInDeposits = roundMoney(row.total);
  }
  for (const row of retAgg) {
    if (row._id) ensure(row._id.toString()).totalOutReturns = roundMoney(row.total);
  }
  for (const row of transferInAgg) {
    if (row._id) ensure(row._id.toString()).totalTransferIn = roundMoney(row.total);
  }
  for (const row of transferOutAgg) {
    if (row._id) {
      const entry = ensure(row._id.toString());
      entry.totalTransferOut = roundMoney(row.totalAmount);
      entry.totalTransferFees = roundMoney(row.totalFee);
    }
  }
  for (const row of chargeAgg) {
    if (row._id) {
      ensure(row._id.toString()).totalStandaloneCharges = roundMoney(row.total);
    }
  }

  for (const entry of map.values()) {
    entry.balance = computeSingleAccountBalance(entry);
  }

  return map;
}

/**
 * Computes live balance for a single payment account.
 */
export async function getAccountBalance(
  accountId: string | mongoose.Types.ObjectId,
): Promise<AccountBalanceSummary> {
  const id =
    typeof accountId === "string"
      ? toObjectId(accountId, "paymentAccountId").toString()
      : accountId.toString();

  const allBalances = await getAllAccountBalances();
  return (
    allBalances.get(id) ?? {
      accountId: id,
      totalInDeposits: 0,
      totalOutReturns: 0,
      totalTransferIn: 0,
      totalTransferOut: 0,
      totalTransferFees: 0,
      totalStandaloneCharges: 0,
      balance: 0,
    }
  );
}

/**
 * Single Source of Truth for Group Fund Reconciliation.
 * Accepts an optional precomputed account balances map to avoid duplicate DB aggregations.
 */
export async function getGroupFundSummary(
  precomputedAccountBalances?: Map<string, AccountBalanceSummary>,
): Promise<GroupFundSummary> {
  const [
    depositAgg,
    returnAgg,
    transferFeeAgg,
    chargeAgg,
    allocatedChargeAgg,
    activeUsers,
    inactiveUsers,
    allAccounts,
    accountBalancesMap,
  ] = await Promise.all([
    DepositModel.aggregate<{ _id: null; total: number }>([
      { $match: { status: "APPROVED", isDeleted: false } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    DepositReturnModel.aggregate<{ _id: string; total: number }>([
      { $match: { status: "APPROVED", isDeleted: false } },
      { $group: { _id: "$returnType", total: { $sum: "$amount" } } },
    ]),
    AccountTransferModel.aggregate<{ _id: null; total: number }>([
      { $match: { isDeleted: false } },
      { $group: { _id: null, total: { $sum: "$transferFee" } } },
    ]),
    AccountChargeModel.aggregate<{ _id: null; total: number }>([
      { $match: { isDeleted: false } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    ChargeAllocationModel.aggregate<{ _id: null; total: number }>([
      { $match: { isDeleted: false } },
      { $group: { _id: null, total: { $sum: "$allocatedAmount" } } },
    ]),
    UserModel.find({ status: "ACTIVE", isDeleted: false })
      .select("_id")
      .lean(),
    UserModel.find({
      $or: [{ status: "INACTIVE" }, { isDeleted: true }],
    })
      .select("_id")
      .lean(),
    PaymentAccountModel.find({}).select("_id").lean(),
    precomputedAccountBalances
      ? Promise.resolve(precomputedAccountBalances)
      : getAllAccountBalances(),
  ]);

  const totalApprovedDeposits = roundMoney(depositAgg[0]?.total || 0);
  let totalApprovedPayoutReturns = 0;
  let totalDonatedWaivers = 0;

  for (const row of returnAgg) {
    if (row._id === "DONATED_WAIVER") {
      totalDonatedWaivers = roundMoney(totalDonatedWaivers + row.total);
    } else {
      totalApprovedPayoutReturns = roundMoney(
        totalApprovedPayoutReturns + row.total,
      );
    }
  }

  const totalTransferFees = roundMoney(transferFeeAgg[0]?.total || 0);
  const totalStandaloneCharges = roundMoney(chargeAgg[0]?.total || 0);
  const totalAllocatedMemberCharges = roundMoney(
    allocatedChargeAgg[0]?.total || 0,
  );

  // Sum active and former member net balances in parallel
  const activeIds = activeUsers.map((u) => u._id);
  const inactiveIds = inactiveUsers.map((u) => u._id);
  const [activeBalancesMap, inactiveBalancesMap] = await Promise.all([
    activeIds.length > 0
      ? getMemberBalancesMap(activeIds)
      : Promise.resolve(new Map<string, MemberBalanceSummary>()),
    inactiveIds.length > 0
      ? getMemberBalancesMap(inactiveIds)
      : Promise.resolve(new Map<string, MemberBalanceSummary>()),
  ]);

  let activeMemberBalancesSum = 0;
  for (const balance of activeBalancesMap.values()) {
    activeMemberBalancesSum = roundMoney(
      activeMemberBalancesSum + balance.netBalance,
    );
  }

  let unsettledFormerMemberPayable = 0;
  for (const balance of inactiveBalancesMap.values()) {
    if (balance.netBalance > 0) {
      unsettledFormerMemberPayable = roundMoney(
        unsettledFormerMemberPayable + balance.netBalance,
      );
    }
  }

  // Sum all account balances (verify exact reconciliation)
  const seenAccountIds = new Set<string>(
    allAccounts.map((a) => a._id.toString()),
  );
  let accountBalancesSum = 0;
  for (const [accId, summary] of accountBalancesMap.entries()) {
    if (seenAccountIds.has(accId) || summary.balance !== 0) {
      accountBalancesSum = roundMoney(accountBalancesSum + summary.balance);
    }
  }

  const reconciled = computeFundReconciliation({
    totalApprovedDeposits,
    totalApprovedPayoutReturns,
    totalTransferFees,
    totalStandaloneCharges,
    unsettledFormerMemberPayable,
    accountBalancesSum,
  });

  const unallocatedLegacyCharges = roundMoney(
    reconciled.totalCharges - totalAllocatedMemberCharges,
  );
  const memberLedgerDifference = roundMoney(
    reconciled.totalCashInHand -
      (activeMemberBalancesSum +
        unsettledFormerMemberPayable +
        totalDonatedWaivers),
  );

  return {
    totalApprovedDeposits,
    totalApprovedPayoutReturns,
    totalDonatedWaivers,
    totalTransferFees,
    totalStandaloneCharges,
    totalCharges: reconciled.totalCharges,
    totalAllocatedMemberCharges,
    unallocatedLegacyCharges,
    totalCashInHand: reconciled.totalCashInHand,
    unsettledFormerMemberPayable,
    activeNetFund: reconciled.activeNetFund,
    activeMemberBalancesSum,
    accountBalancesSum,
    reconciliationDifference: reconciled.reconciliationDifference,
    memberLedgerDifference,
  };
}
