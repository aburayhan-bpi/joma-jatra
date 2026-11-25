import { badRequest, conflict, notFound } from "../../core/app-error";
import { AuthUser } from "../../core/auth-guard";
import { connectDB } from "../../core/db";
import { getAccountBalance } from "../../shared/accounting.service";
import {
  normalizeTrxId,
  resolveTransactionDate,
  roundMoney,
  toObjectId,
} from "../../shared/normalize";
import {
  buildPaginationMeta,
  buildSearchFilter,
  PaginationQuery,
} from "../../shared/pagination";
import { logActivity } from "../activity-logs/activity-log.service";
import { PaymentAccountModel } from "../payment-accounts/payment-account.model";
import { AccountTransferModel } from "./account-transfer.model";

export interface ListTransfersParams {
  pagination: PaginationQuery;
  accountId?: string;
  onlyDeleted?: boolean;
}

export async function listTransfers({
  pagination,
  accountId,
  onlyDeleted = false,
}: ListTransfersParams) {
  await connectDB();

  const filter: Record<string, unknown> = {
    isDeleted: onlyDeleted,
    ...buildSearchFilter(pagination.search, ["trxId", "note"]),
  };

  if (accountId) {
    const accObjId = toObjectId(accountId, "accountId");
    filter.$and = [
      { $or: [{ fromAccountId: accObjId }, { toAccountId: accObjId }] },
    ];
  }

  const [items, total] = await Promise.all([
    AccountTransferModel.find(filter)
      .sort({ transferDate: -1, createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("fromAccountId", "accountName accountNumber method")
      .populate("toAccountId", "accountName accountNumber method")
      .populate("createdBy", "name role")
      .lean(),
    AccountTransferModel.countDocuments(filter),
  ]);

  return {
    items: items.map((t) => ({ ...t, id: t._id.toString() })),
    meta: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
}

/**
 * Prevents duplicate TrxID across active (non-deleted) internal transfers.
 */
async function ensureUniqueTransferTrxId(trxId?: string, excludeId?: string) {
  if (!trxId) return;
  const query: Record<string, unknown> = { trxId, isDeleted: false };
  if (excludeId) {
    query._id = { $ne: toObjectId(excludeId, "transferId") };
  }
  const existing = await AccountTransferModel.findOne(query)
    .select("_id")
    .lean();
  if (existing) {
    throw conflict(
      `Duplicate TrxID "${trxId}" already exists on an existing transfer record.`,
    );
  }
}

export async function getTransferById(
  id: string,
  options?: { includeDeleted?: boolean },
) {
  await connectDB();

  const filter: Record<string, unknown> = { _id: toObjectId(id, "transferId") };
  if (!options?.includeDeleted) {
    filter.isDeleted = false;
  }

  const transfer = await AccountTransferModel.findOne(filter)
    .populate("fromAccountId", "accountName accountNumber method")
    .populate("toAccountId", "accountName accountNumber method")
    .populate("createdBy", "name role")
    .lean();

  if (!transfer) throw notFound("Transfer record not found");
  return { ...transfer, id: transfer._id.toString() };
}

/**
 * Records an internal transfer between two group payment accounts (with optional cash-out/transfer fee).
 * Validates fromAccount balance >= (amount + transferFee).
 */
export async function createTransfer(
  actor: AuthUser,
  input: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    transferFee?: number;
    transferDate?: Date;
    trxId?: string;
    proofImage?: string;
    note?: string;
  },
) {
  await connectDB();

  const [fromAccount, toAccount] = await Promise.all([
    PaymentAccountModel.findOne({
      _id: toObjectId(input.fromAccountId, "fromAccountId"),
      isDeleted: false,
    }),
    PaymentAccountModel.findOne({
      _id: toObjectId(input.toAccountId, "toAccountId"),
      isDeleted: false,
    }),
  ]);

  if (!fromAccount) throw notFound("Source payment account not found");
  if (!toAccount) throw notFound("Destination payment account not found");

  const amount = roundMoney(input.amount);
  const fee = roundMoney(input.transferFee || 0);
  const totalDeduction = roundMoney(amount + fee);
  const fromBalance = await getAccountBalance(fromAccount._id);

  if (fromBalance.balance < totalDeduction) {
    throw badRequest(
      `Insufficient balance in ${fromAccount.accountName} (${fromAccount.method}). Available: ৳${fromBalance.balance}, Required (amount + fee): ৳${totalDeduction}.`,
    );
  }

  const normalizedTrx = normalizeTrxId(input.trxId);
  await ensureUniqueTransferTrxId(normalizedTrx);

  const transfer = await AccountTransferModel.create({
    fromAccountId: fromAccount._id,
    toAccountId: toAccount._id,
    amount,
    transferFee: fee,
    transferDate: resolveTransactionDate(input.transferDate),
    trxId: normalizedTrx,
    proofImage: input.proofImage || "",
    note: input.note || "",
    createdBy: toObjectId(actor.id, "actorId"),
  });

  await logActivity({
    entityType: "TRANSFER",
    entityId: transfer._id,
    action: "CREATED",
    summary: `${actor.name} transferred ৳${transfer.amount}${fee > 0 ? ` (+ ৳${fee} charge)` : ""} from ${fromAccount.accountName} (${fromAccount.method}) to ${toAccount.accountName} (${toAccount.method})`,
    amount: transfer.amount,
    proofImage: transfer.proofImage || null,
    performedBy: actor.id,
  });

  return getTransferById(transfer._id.toString());
}

export async function softDeleteTransfer(actor: AuthUser, id: string) {
  await connectDB();

  const transfer = await AccountTransferModel.findOne({
    _id: toObjectId(id, "transferId"),
    isDeleted: false,
  });
  if (!transfer) throw notFound("Transfer record not found");

  // Ensure reversing this transfer won't push destination account negative
  const toBalance = await getAccountBalance(transfer.toAccountId);
  if (toBalance.balance < transfer.amount) {
    throw badRequest(
      `Cannot delete transfer: destination account currently holds ৳${toBalance.balance}, which is less than the transferred ৳${transfer.amount}.`,
    );
  }

  transfer.isDeleted = true;
  transfer.deletedAt = new Date();
  transfer.deletedBy = toObjectId(actor.id, "actorId");
  await transfer.save();

  await logActivity({
    entityType: "TRANSFER",
    entityId: transfer._id,
    action: "DELETED",
    summary: `${actor.name} soft-deleted ৳${transfer.amount} internal transfer`,
    amount: transfer.amount,
    performedBy: actor.id,
  });

  return { id: transfer._id.toString(), isDeleted: true };
}

export async function restoreTransfer(actor: AuthUser, id: string) {
  await connectDB();

  const transfer = await AccountTransferModel.findOne({
    _id: toObjectId(id, "transferId"),
    isDeleted: true,
  });
  if (!transfer) throw notFound("Deleted transfer record not found");

  // Ensure both payment accounts are not soft-deleted before restoring
  const [fromExists, toExists] = await Promise.all([
    PaymentAccountModel.exists({
      _id: transfer.fromAccountId,
      isDeleted: false,
    }),
    PaymentAccountModel.exists({
      _id: transfer.toAccountId,
      isDeleted: false,
    }),
  ]);
  if (!fromExists || !toExists) {
    throw badRequest(
      "Cannot restore transfer: one or both linked payment accounts are currently in Trash. Restore the account(s) first.",
    );
  }

  if (transfer.trxId) {
    await ensureUniqueTransferTrxId(transfer.trxId, transfer._id.toString());
  }

  const totalDeduction = roundMoney(transfer.amount + transfer.transferFee);
  const fromBalance = await getAccountBalance(transfer.fromAccountId);
  if (fromBalance.balance < totalDeduction) {
    throw badRequest(
      `Cannot restore transfer: source account balance (৳${fromBalance.balance}) is less than required ৳${totalDeduction}.`,
    );
  }

  transfer.isDeleted = false;
  transfer.deletedAt = null;
  transfer.deletedBy = null;
  await transfer.save();

  await logActivity({
    entityType: "TRANSFER",
    entityId: transfer._id,
    action: "RESTORED",
    summary: `${actor.name} restored ৳${transfer.amount} internal transfer`,
    amount: transfer.amount,
    performedBy: actor.id,
  });

  return getTransferById(transfer._id.toString());
}
