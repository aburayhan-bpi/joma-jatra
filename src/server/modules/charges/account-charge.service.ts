import { badRequest, notFound } from "../../core/app-error";
import { AuthUser } from "../../core/auth-guard";
import { connectDB } from "../../core/db";
import { getAccountBalance } from "../../shared/accounting.service";
import { toObjectId } from "../../shared/normalize";
import {
  buildPaginationMeta,
  buildSearchFilter,
  PaginationQuery,
} from "../../shared/pagination";
import { logActivity } from "../activity-logs/activity-log.service";
import { PaymentAccountModel } from "../payment-accounts/payment-account.model";
import { AccountChargeModel } from "./account-charge.model";

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

  return {
    items: items.map((c) => ({ ...c, id: c._id.toString() })),
    meta: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
}

export async function getChargeById(id: string) {
  await connectDB();

  const charge = await AccountChargeModel.findById(toObjectId(id, "chargeId"))
    .populate("paymentAccountId", "accountName accountNumber method")
    .populate("createdBy", "name role")
    .lean();

  if (!charge) throw notFound("Charge record not found");
  return { ...charge, id: charge._id.toString() };
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

  const accountBalance = await getAccountBalance(account._id);
  if (accountBalance.balance < input.amount) {
    throw badRequest(
      `Insufficient balance in ${account.accountName} (${account.method}). Available: ৳${accountBalance.balance}, Required: ৳${input.amount}.`,
    );
  }

  const charge = await AccountChargeModel.create({
    paymentAccountId: account._id,
    amount: input.amount,
    title: input.title,
    chargeDate: input.chargeDate ?? new Date(),
    proofImage: input.proofImage || "",
    note: input.note || "",
    createdBy: toObjectId(actor.id, "actorId"),
  });

  await logActivity({
    entityType: "CHARGE",
    entityId: charge._id,
    action: "CREATED",
    summary: `${actor.name} recorded ৳${charge.amount} charge ("${charge.title}") on ${account.accountName} (${account.method})`,
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

  await logActivity({
    entityType: "CHARGE",
    entityId: charge._id,
    action: "DELETED",
    summary: `${actor.name} soft-deleted ৳${charge.amount} charge ("${charge.title}")`,
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

  const accountBalance = await getAccountBalance(charge.paymentAccountId);
  if (accountBalance.balance < charge.amount) {
    throw badRequest(
      `Cannot restore charge: payment account balance (৳${accountBalance.balance}) is less than ৳${charge.amount}.`,
    );
  }

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
