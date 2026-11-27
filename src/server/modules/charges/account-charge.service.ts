import { badRequest, notFound } from "../../core/app-error";
import { AuthUser } from "../../core/auth-guard";
import { connectDB } from "../../core/db";
import { getAccountBalance } from "../../shared/accounting.service";
import {
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
import { AccountChargeModel } from "./account-charge.model";
import {
  getAllocationsMapBySourceIds,
  persistChargeAllocationsAndNotify,
  prepareChargeAllocations,
  restoreAllocationsForSource,
  softDeleteAllocationsForSource,
} from "./charge-allocation.service";

export interface ListChargesParams {
  pagination: PaginationQuery;
  paymentAccountId?: string;
  onlyDeleted?: boolean;
}

export async function listCharges({
  pagination,
  paymentAccountId,
  onlyDeleted = false,
}: ListChargesParams) {
  await connectDB();

  const filter: Record<string, unknown> = {
    isDeleted: onlyDeleted,
    ...buildSearchFilter(pagination.search, ["title", "note"]),
  };

  if (paymentAccountId) {
    filter.paymentAccountId = toObjectId(paymentAccountId, "paymentAccountId");
  }

  const [items, total] = await Promise.all([
    AccountChargeModel.find(filter)
      .sort({ chargeDate: -1, createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("paymentAccountId", "accountName accountNumber method")
      .populate("createdBy", "name role")
      .lean(),
    AccountChargeModel.countDocuments(filter),
  ]);

  const allocationsMap = await getAllocationsMapBySourceIds(
    "ACCOUNT_CHARGE",
    items.map((c) => c._id),
    onlyDeleted,
  );

  return {
    items: items.map((c) => ({
      ...c,
      id: c._id.toString(),
      allocations: allocationsMap.get(c._id.toString()) || [],
    })),
    meta: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
}

export async function getChargeById(
  id: string,
  options?: { includeDeleted?: boolean },
) {
  await connectDB();

  const filter: Record<string, unknown> = { _id: toObjectId(id, "chargeId") };
  if (!options?.includeDeleted) {
    filter.isDeleted = false;
  }

  const charge = await AccountChargeModel.findOne(filter)
    .populate("paymentAccountId", "accountName accountNumber method")
    .populate("createdBy", "name role")
    .lean();

  if (!charge) throw notFound("Charge record not found");

  const allocationsMap = await getAllocationsMapBySourceIds(
    "ACCOUNT_CHARGE",
    [charge._id],
    Boolean(charge.isDeleted),
  );

  return {
    ...charge,
    id: charge._id.toString(),
    allocations: allocationsMap.get(charge._id.toString()) || [],
  };
}

export async function createCharge(
  actor: AuthUser,
  input: {
    paymentAccountId: string;
    amount: number;
    title: string;
    chargeDate?: Date;
    proofImage?: string;
    note?: string;
  },
) {
  await connectDB();

  const account = await PaymentAccountModel.findOne({
    _id: toObjectId(input.paymentAccountId, "paymentAccountId"),
    isDeleted: false,
  });
  if (!account) throw notFound("Payment account not found");

  const amount = roundMoney(input.amount);
  const accountBalance = await getAccountBalance(account._id);
  if (accountBalance.balance < amount) {
    throw badRequest(
      `Insufficient balance in ${account.accountName} (${account.method}). Available: ৳${accountBalance.balance}, Required: ৳${amount}.`,
    );
  }

  // Validate and compute pro-rata allocations across ACTIVE members BEFORE persisting
  const preparedAllocations = await prepareChargeAllocations({
    chargeAmount: amount,
    bearerType: "SHARED_PRO_RATA",
  });

  const chargeDate = resolveTransactionDate(input.chargeDate);
  const charge = await AccountChargeModel.create({
    paymentAccountId: account._id,
    amount,
    title: input.title,
    chargeDate,
    proofImage: input.proofImage || "",
    note: input.note || "",
    createdBy: toObjectId(actor.id, "actorId"),
  });

  try {
    await persistChargeAllocationsAndNotify({
      sourceType: "ACCOUNT_CHARGE",
      sourceId: charge._id,
      title: charge.title,
      chargeDate,
      totalChargeAmount: charge.amount,
      recordedByName: actor.name,
      allocations: preparedAllocations,
    });
  } catch (err) {
    await AccountChargeModel.deleteOne({ _id: charge._id });
    throw err;
  }

  await logActivity({
    entityType: "CHARGE",
    entityId: charge._id,
    action: "CREATED",
    summary: `${actor.name} recorded ৳${charge.amount} charge ("${charge.title}") on ${account.accountName} (${account.method}) — split across ${preparedAllocations.length} active member(s)`,
    amount: charge.amount,
    proofImage: charge.proofImage || null,
    performedBy: actor.id,
  });

  return getChargeById(charge._id.toString());
}

export async function softDeleteCharge(actor: AuthUser, id: string) {
  await connectDB();

  const charge = await AccountChargeModel.findOne({
    _id: toObjectId(id, "chargeId"),
    isDeleted: false,
  });
  if (!charge) throw notFound("Charge record not found");

  charge.isDeleted = true;
  charge.deletedAt = new Date();
  charge.deletedBy = toObjectId(actor.id, "actorId");
  await charge.save();

  await softDeleteAllocationsForSource(actor.id, "ACCOUNT_CHARGE", charge._id);

  await logActivity({
    entityType: "CHARGE",
    entityId: charge._id,
    action: "DELETED",
    summary: `${actor.name} soft-deleted ৳${charge.amount} charge ("${charge.title}") and refunded member shares`,
    amount: charge.amount,
    performedBy: actor.id,
  });

  return { id: charge._id.toString(), isDeleted: true };
}

export async function restoreCharge(actor: AuthUser, id: string) {
  await connectDB();

  const charge = await AccountChargeModel.findOne({
    _id: toObjectId(id, "chargeId"),
    isDeleted: true,
  });
  if (!charge) throw notFound("Deleted charge record not found");

  // Ensure the charged payment account is not soft-deleted
  const accountExists = await PaymentAccountModel.exists({
    _id: charge.paymentAccountId,
    isDeleted: false,
  });
  if (!accountExists) {
    throw badRequest(
      "Cannot restore charge: its payment account is currently in Trash. Restore the payment account first.",
    );
  }

  const accountBalance = await getAccountBalance(charge.paymentAccountId);
  if (accountBalance.balance < charge.amount) {
    throw badRequest(
      `Cannot restore charge: payment account balance (৳${accountBalance.balance}) is less than ৳${charge.amount}.`,
    );
  }

  // Validate member balances & pending return safety before restoring charge allocations
  await restoreAllocationsForSource("ACCOUNT_CHARGE", charge._id);

  charge.isDeleted = false;
  charge.deletedAt = null;
  charge.deletedBy = null;
  await charge.save();

  await logActivity({
    entityType: "CHARGE",
    entityId: charge._id,
    action: "RESTORED",
    summary: `${actor.name} restored ৳${charge.amount} charge ("${charge.title}")`,
    amount: charge.amount,
    performedBy: actor.id,
  });

  return getChargeById(charge._id.toString());
}
