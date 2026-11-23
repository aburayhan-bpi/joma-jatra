import { EntrySource, PaymentMethodType, TransactionStatus } from "@/types/backend";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
} from "../../core/app-error";
import { AuthUser } from "../../core/auth-guard";
import { connectDB } from "../../core/db";
import {
  getAccountBalance,
  getMemberBalance,
} from "../../shared/accounting.service";
import {
  formatYearMonth,
  normalizeTrxId,
  roundMoney,
  toObjectId,
} from "../../shared/normalize";
import {
  buildPaginationMeta,
  buildSearchFilter,
  PaginationQuery,
} from "../../shared/pagination";
import { logActivity } from "../activity-logs/activity-log.service";
import { UserModel } from "../members/user.model";
import { PaymentAccountModel } from "../payment-accounts/payment-account.model";
import { DepositModel } from "./deposit.model";

export interface ListDepositsParams {
  pagination: PaginationQuery;
  memberId?: string;
  month?: string;
  status?: string;
  paymentMethod?: string;
  paymentAccountId?: string;
  onlyDeleted?: boolean;
}

/**
 * Checks for duplicate TrxID across active PENDING/APPROVED deposits.
 */
async function ensureUniqueTrxId(trxId?: string, excludeId?: string) {
  if (!trxId) return;

  const query: Record<string, unknown> = {
    trxId,
    isDeleted: false,
    status: { $in: ["PENDING", "APPROVED"] },
  };
  if (excludeId) {
    query._id = { $ne: toObjectId(excludeId, "depositId") };
  }

  const duplicate = await DepositModel.findOne(query).select("_id memberId month amount").lean();
  if (duplicate) {
    throw conflict(
      `Duplicate TrxID "${trxId}" already exists on an existing deposit. Please verify the transaction reference.`,
    );
  }
}

export async function listDeposits({
  pagination,
  memberId,
  month,
  status,
  paymentMethod,
  paymentAccountId,
  onlyDeleted = false,
}: ListDepositsParams) {
  await connectDB();

  const filter: Record<string, unknown> = {
    isDeleted: onlyDeleted,
    ...buildSearchFilter(pagination.search, ["trxId", "note", "month"]),
  };

  if (memberId) filter.memberId = toObjectId(memberId, "memberId");
  if (month) filter.month = month;
  if (status) filter.status = status;
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (paymentAccountId) {
    filter.paymentAccountId = toObjectId(paymentAccountId, "paymentAccountId");
  }

  // Also match member names if search text is provided
  if (pagination.search) {
    const matchedUsers = await UserModel.find(
      buildSearchFilter(pagination.search, ["name", "email", "phone"]),
    )
      .select("_id")
      .lean();
    if (matchedUsers.length > 0) {
      const existingOr = (filter.$or as Record<string, unknown>[]) || [];
      filter.$or = [
        ...existingOr,
        { memberId: { $in: matchedUsers.map((u) => u._id) } },
      ];
    }
  }

  const [items, total] = await Promise.all([
    DepositModel.find(filter)
      .sort({ depositDate: -1, createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("memberId", "name email phone role status")
      .populate("paymentAccountId", "accountName accountNumber method")
      .populate("createdBy", "name role")
      .populate("reviewedBy", "name role")
      .lean(),
    DepositModel.countDocuments(filter),
  ]);

  return {
    items: items.map((d) => ({ ...d, id: d._id.toString() })),
    meta: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
}

export async function getDepositById(id: string) {
  await connectDB();

  const deposit = await DepositModel.findById(toObjectId(id, "depositId"))
    .populate("memberId", "name email phone role status")
    .populate("paymentAccountId", "accountName accountNumber method")
    .populate("createdBy", "name role")
    .populate("reviewedBy", "name role")
    .lean();

  if (!deposit) {
    throw notFound("Deposit record not found");
  }

  return { ...deposit, id: deposit._id.toString() };
}

/**
 * Creates a flexible deposit entry:
 * - MEMBER -> always PENDING (for self)
 * - ADMIN -> directly APPROVED (manual entry, custom date/month allowed)
 * - CASHIER -> directly APPROVED for OTHER members; PENDING if entering for self (Admin must approve)
 */
export async function createDeposit(
  actor: AuthUser,
  input: {
    memberId?: string;
    amount: number;
    month?: string;
    depositDate?: Date;
    paymentAccountId: string;
    paymentMethod?: PaymentMethodType;
    trxId?: string;
    proofImage?: string;
    note?: string;
  },
) {
  await connectDB();

  const canEnterForOthers = actor.role === "ADMIN" || actor.role === "CASHIER";
  const targetMemberId =
    canEnterForOthers && input.memberId ? input.memberId : actor.id;

  const targetMember = await UserModel.findOne({
    _id: toObjectId(targetMemberId, "memberId"),
    isDeleted: false,
    status: "ACTIVE",
  });
  if (!targetMember) {
    throw notFound("Active member not found for this deposit");
  }

  const account = await PaymentAccountModel.findOne({
    _id: toObjectId(input.paymentAccountId, "paymentAccountId"),
    isDeleted: false,
    isActive: true,
  });
  if (!account) {
    throw notFound("Active payment account not found");
  }

  if (input.paymentMethod && input.paymentMethod !== account.method) {
    throw badRequest(
      `Payment method (${input.paymentMethod}) does not match selected account "${account.accountName}" (${account.method}).`,
    );
  }

  const normalizedTrx = normalizeTrxId(input.trxId);
  await ensureUniqueTrxId(normalizedTrx);

  const depositDate =
    canEnterForOthers && input.depositDate ? input.depositDate : new Date();
  const month = input.month || formatYearMonth(depositDate);

  // Determine approval status & entrySource
  let status: TransactionStatus = "PENDING";
  let entrySource: EntrySource = "MEMBER_REQUEST";
  let reviewedBy = null;
  let reviewedAt = null;

  const isSelfEntry = targetMember._id.toString() === actor.id;
  if (actor.role === "ADMIN") {
    status = "APPROVED";
    entrySource = "ADMIN_MANUAL";
    reviewedBy = toObjectId(actor.id, "actorId");
    reviewedAt = new Date();
  } else if (actor.role === "CASHIER" && !isSelfEntry) {
    status = "APPROVED";
    entrySource = "CASHIER_MANUAL";
    reviewedBy = toObjectId(actor.id, "actorId");
    reviewedAt = new Date();
  }

  const deposit = await DepositModel.create({
    memberId: targetMember._id,
    amount: input.amount,
    month,
    depositDate,
    paymentMethod: account.method,
    paymentAccountId: account._id,
    trxId: normalizedTrx,
    proofImage: input.proofImage || "",
    note: input.note || "",
    entrySource,
    status,
    createdBy: toObjectId(actor.id, "actorId"),
    reviewedBy,
    reviewedAt,
  });

  await logActivity({
    entityType: "DEPOSIT",
    entityId: deposit._id,
    targetMemberId: targetMember._id,
    action: status === "APPROVED" ? "APPROVED" : "CREATED",
    summary:
      status === "APPROVED"
        ? `${actor.name} recorded & approved ৳${deposit.amount} deposit for ${targetMember.name} (${month} via ${deposit.paymentMethod})`
        : `${actor.name} submitted ৳${deposit.amount} deposit request for ${month} via ${deposit.paymentMethod}`,
    amount: deposit.amount,
    proofImage: deposit.proofImage || null,
    performedBy: actor.id,
  });

  return getDepositById(deposit._id.toString());
}

/**
 * Updates a deposit:
 * - Members/Cashiers can only edit their own PENDING deposits.
 * - Admins can edit any non-deleted deposit (logs before -> after in Audit Trail).
 */
export async function updateDeposit(
  actor: AuthUser,
  id: string,
  input: {
    amount?: number;
    month?: string;
    depositDate?: Date;
    paymentAccountId?: string;
    paymentMethod?: PaymentMethodType;
    trxId?: string;
    proofImage?: string;
    note?: string;
    editReason?: string;
  },
) {
  await connectDB();

  const deposit = await DepositModel.findOne({
    _id: toObjectId(id, "depositId"),
    isDeleted: false,
  });
  if (!deposit) {
    throw notFound("Deposit not found");
  }

  const isOwner = deposit.memberId.toString() === actor.id;
  if (actor.role !== "ADMIN") {
    if (!isOwner || deposit.status !== "PENDING") {
      throw forbidden(
        "Only your own PENDING deposit requests can be edited. Approved records are locked.",
      );
    }
  }

  const before = {
    amount: deposit.amount,
    month: deposit.month,
    paymentAccountId: deposit.paymentAccountId.toString(),
    paymentMethod: deposit.paymentMethod,
    trxId: deposit.trxId || null,
    note: deposit.note || "",
  };

  const nextAmount = input.amount !== undefined ? input.amount : deposit.amount;
  const nextAccountId = input.paymentAccountId || deposit.paymentAccountId.toString();

  // Accounting integrity guard when Admin modifies an APPROVED deposit
  if (deposit.status === "APPROVED") {
    const amountReduction = roundMoney(deposit.amount - nextAmount);
    if (amountReduction > 0) {
      const memberBalance = await getMemberBalance(deposit.memberId);
      if (memberBalance.netBalance < amountReduction) {
        throw badRequest(
          `Cannot reduce approved deposit by ৳${amountReduction}: member's remaining net balance is only ৳${memberBalance.netBalance}.`,
        );
      }
    }

    const isAccountChanged = nextAccountId !== deposit.paymentAccountId.toString();
    const oldAccountReduction = isAccountChanged
      ? deposit.amount
      : Math.max(0, amountReduction);

    if (oldAccountReduction > 0) {
      const oldAccountBalance = await getAccountBalance(deposit.paymentAccountId);
      if (oldAccountBalance.balance < oldAccountReduction) {
        throw badRequest(
          `Cannot modify approved deposit: original payment account only holds ৳${oldAccountBalance.balance}, which is less than the required ৳${oldAccountReduction} adjustment.`,
        );
      }
    }
  }

  if (input.paymentAccountId) {
    const account = await PaymentAccountModel.findOne({
      _id: toObjectId(input.paymentAccountId, "paymentAccountId"),
      isDeleted: false,
    });
    if (!account) throw notFound("Payment account not found");
    if (input.paymentMethod && input.paymentMethod !== account.method) {
      throw badRequest(
        `Payment method (${input.paymentMethod}) does not match selected account "${account.accountName}" (${account.method}).`,
      );
    }
    deposit.paymentAccountId = account._id;
    deposit.paymentMethod = account.method;
  } else if (input.paymentMethod && input.paymentMethod !== deposit.paymentMethod) {
    throw badRequest(
      "To change payment method, please select a matching paymentAccountId.",
    );
  }

  if (input.trxId !== undefined) {
    const normalizedTrx = normalizeTrxId(input.trxId);
    await ensureUniqueTrxId(normalizedTrx, deposit._id.toString());
    deposit.trxId = normalizedTrx;
  }

  if (input.amount !== undefined) deposit.amount = input.amount;
  if (input.month !== undefined) deposit.month = input.month;
  if (input.depositDate !== undefined) deposit.depositDate = input.depositDate;
  if (input.proofImage !== undefined) deposit.proofImage = input.proofImage;
  if (input.note !== undefined) deposit.note = input.note;

  await deposit.save();

  await logActivity({
    entityType: "DEPOSIT",
    entityId: deposit._id,
    targetMemberId: deposit.memberId,
    action: "UPDATED",
    summary: `${actor.name} updated deposit (${deposit.month}) from ৳${before.amount} to ৳${deposit.amount}${input.editReason ? ` — Reason: ${input.editReason}` : ""}`,
    amount: deposit.amount,
    proofImage: deposit.proofImage || null,
    changes: {
      before,
      after: {
        amount: deposit.amount,
        month: deposit.month,
        paymentMethod: deposit.paymentMethod,
        trxId: deposit.trxId || null,
        note: deposit.note || "",
        editReason: input.editReason || null,
      },
    },
    performedBy: actor.id,
  });

  return getDepositById(deposit._id.toString());
}

/**
 * Approves or rejects a PENDING deposit.
 * Anti-Conflict Rule: CASHIER cannot approve/reject their own deposit.
 */
export async function reviewDeposit(
  actor: AuthUser,
  id: string,
  input: { status: "APPROVED" | "REJECTED"; rejectionReason?: string },
) {
  await connectDB();

  const deposit = await DepositModel.findOne({
    _id: toObjectId(id, "depositId"),
    isDeleted: false,
  });
  if (!deposit) {
    throw notFound("Deposit not found");
  }

  if (deposit.status !== "PENDING") {
    throw badRequest(`This deposit has already been ${deposit.status}`);
  }

  if (actor.role === "CASHIER" && deposit.memberId.toString() === actor.id) {
    throw forbidden(
      "Cashiers cannot approve or reject their own deposits. Please ask an Admin.",
    );
  }

  deposit.status = input.status;
  deposit.rejectionReason =
    input.status === "REJECTED" ? input.rejectionReason || "Rejected" : null;
  deposit.reviewedBy = toObjectId(actor.id, "actorId");
  deposit.reviewedAt = new Date();
  await deposit.save();

  const member = await UserModel.findById(deposit.memberId).select("name").lean();

  await logActivity({
    entityType: "DEPOSIT",
    entityId: deposit._id,
    targetMemberId: deposit.memberId,
    action: input.status,
    summary:
      input.status === "APPROVED"
        ? `${actor.name} approved ৳${deposit.amount} deposit from ${member?.name || "Member"} (${deposit.month})`
        : `${actor.name} rejected ৳${deposit.amount} deposit from ${member?.name || "Member"} — ${deposit.rejectionReason}`,
    amount: deposit.amount,
    proofImage: deposit.proofImage || null,
    performedBy: actor.id,
  });

  return getDepositById(deposit._id.toString());
}

/**
 * Soft-deletes a deposit (Members can cancel their own PENDING deposit; Admins can soft-delete any).
 */
export async function softDeleteDeposit(actor: AuthUser, id: string) {
  await connectDB();

  const deposit = await DepositModel.findOne({
    _id: toObjectId(id, "depositId"),
    isDeleted: false,
  });
  if (!deposit) {
    throw notFound("Deposit not found");
  }

  const isOwner = deposit.memberId.toString() === actor.id;
  if (actor.role !== "ADMIN") {
    if (!isOwner || deposit.status !== "PENDING") {
      throw forbidden("You can only cancel your own PENDING deposit requests");
    }
  }

  // Prevent soft-deleting an APPROVED deposit if doing so would make member or account balance negative
  if (deposit.status === "APPROVED") {
    const [memberBalance, accountBalance] = await Promise.all([
      getMemberBalance(deposit.memberId),
      getAccountBalance(deposit.paymentAccountId),
    ]);

    if (memberBalance.netBalance < deposit.amount) {
      throw badRequest(
        `Cannot delete approved deposit of ৳${deposit.amount}: member's current net balance is ৳${memberBalance.netBalance} (part of this money was already returned).`,
      );
    }

    if (accountBalance.balance < deposit.amount) {
      throw badRequest(
        `Cannot delete approved deposit of ৳${deposit.amount}: source payment account currently holds ৳${accountBalance.balance}.`,
      );
    }
  }

  deposit.isDeleted = true;
  deposit.deletedAt = new Date();
  deposit.deletedBy = toObjectId(actor.id, "actorId");
  await deposit.save();

  await logActivity({
    entityType: "DEPOSIT",
    entityId: deposit._id,
    targetMemberId: deposit.memberId,
    action: "DELETED",
    summary: `${actor.name} deleted/cancelled ৳${deposit.amount} deposit (${deposit.month})`,
    amount: deposit.amount,
    performedBy: actor.id,
  });

  return { id: deposit._id.toString(), isDeleted: true };
}

/**
 * Admin restores a soft-deleted deposit (re-checking TrxID uniqueness).
 */
export async function restoreDeposit(actor: AuthUser, id: string) {
  await connectDB();

  const deposit = await DepositModel.findOne({
    _id: toObjectId(id, "depositId"),
    isDeleted: true,
  });
  if (!deposit) {
    throw notFound("Deleted deposit not found");
  }

  if (deposit.trxId && deposit.status !== "REJECTED") {
    await ensureUniqueTrxId(deposit.trxId, deposit._id.toString());
  }

  deposit.isDeleted = false;
  deposit.deletedAt = null;
  deposit.deletedBy = null;
  await deposit.save();

  await logActivity({
    entityType: "DEPOSIT",
    entityId: deposit._id,
    targetMemberId: deposit.memberId,
    action: "RESTORED",
    summary: `${actor.name} restored ৳${deposit.amount} deposit (${deposit.month})`,
    amount: deposit.amount,
    performedBy: actor.id,
  });

  return getDepositById(deposit._id.toString());
}
