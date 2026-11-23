import { PaymentAccountType, PaymentMethodType } from "@/types/backend";
import { badRequest, notFound } from "../../core/app-error";
import { AuthUser } from "../../core/auth-guard";
import { connectDB } from "../../core/db";
import {
  getAccountBalance,
  getAllAccountBalances,
} from "../../shared/accounting.service";
import { toObjectId } from "../../shared/normalize";
import {
  buildPaginationMeta,
  buildSearchFilter,
  PaginationQuery,
} from "../../shared/pagination";
import { logActivity } from "../activity-logs/activity-log.service";
import { PaymentAccountModel } from "./payment-account.model";

export interface ListPaymentAccountsParams {
  pagination: PaginationQuery;
  method?: string;
  isActive?: boolean;
  onlyDeleted?: boolean;
}

/**
 * Lists payment accounts with URL pagination, search, filters, and live computed balances.
 */
export async function listPaymentAccounts({
  pagination,
  method,
  isActive,
  onlyDeleted = false,
}: ListPaymentAccountsParams) {
  await connectDB();

  const filter: Record<string, unknown> = {
    isDeleted: onlyDeleted,
    ...buildSearchFilter(pagination.search, [
      "accountName",
      "accountNumber",
      "bankName",
      "method",
    ]),
  };

  if (method) filter.method = method;
  if (isActive !== undefined) filter.isActive = isActive;

  const [accounts, total, balancesMap] = await Promise.all([
    PaymentAccountModel.find(filter)
      .sort({ method: 1, createdAt: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("createdBy", "name email role")
      .lean(),
    PaymentAccountModel.countDocuments(filter),
    getAllAccountBalances(),
  ]);

  const items = accounts.map((acc) => {
    const summary = balancesMap.get(acc._id.toString()) ?? {
      accountId: acc._id.toString(),
      totalInDeposits: 0,
      totalOutReturns: 0,
      totalTransferIn: 0,
      totalTransferOut: 0,
      totalTransferFees: 0,
      totalStandaloneCharges: 0,
      balance: 0,
    };

    return {
      ...acc,
      id: acc._id.toString(),
      balance: summary.balance,
      balanceBreakdown: summary,
    };
  });

  return {
    items,
    meta: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
}

export async function getPaymentAccountById(id: string) {
  await connectDB();

  const account = await PaymentAccountModel.findById(
    toObjectId(id, "paymentAccountId"),
  )
    .populate("createdBy", "name email role")
    .lean();

  if (!account) {
    throw notFound("Payment account not found");
  }

  const balanceBreakdown = await getAccountBalance(account._id);
  return {
    ...account,
    id: account._id.toString(),
    balance: balanceBreakdown.balance,
    balanceBreakdown,
  };
}

export async function createPaymentAccount(
  actor: AuthUser,
  input: {
    method: PaymentMethodType;
    accountName: string;
    accountNumber: string;
    accountType?: PaymentAccountType;
    bankName?: string;
    branchName?: string;
    routingNumber?: string;
    note?: string;
    isActive?: boolean;
  },
) {
  await connectDB();

  const account = await PaymentAccountModel.create({
    ...input,
    createdBy: toObjectId(actor.id, "actorId"),
  });

  await logActivity({
    entityType: "PAYMENT_ACCOUNT",
    entityId: account._id,
    action: "CREATED",
    summary: `${actor.name} added ${account.method} account "${account.accountName}" (${account.accountNumber})`,
    performedBy: actor.id,
  });

  return getPaymentAccountById(account._id.toString());
}

export async function updatePaymentAccount(
  actor: AuthUser,
  id: string,
  input: Partial<{
    method: PaymentMethodType;
    accountName: string;
    accountNumber: string;
    accountType: PaymentAccountType;
    bankName: string;
    branchName: string;
    routingNumber: string;
    note: string;
    isActive: boolean;
  }>,
) {
  await connectDB();

  const account = await PaymentAccountModel.findOne({
    _id: toObjectId(id, "paymentAccountId"),
    isDeleted: false,
  });

  if (!account) {
    throw notFound("Payment account not found");
  }

  const before = {
    method: account.method,
    accountName: account.accountName,
    accountNumber: account.accountNumber,
    isActive: account.isActive,
  };

  Object.assign(account, input);
  await account.save();

  await logActivity({
    entityType: "PAYMENT_ACCOUNT",
    entityId: account._id,
    action: "UPDATED",
    summary: `${actor.name} updated payment account "${account.accountName}"`,
    changes: {
      before,
      after: {
        method: account.method,
        accountName: account.accountName,
        accountNumber: account.accountNumber,
        isActive: account.isActive,
      },
    },
    performedBy: actor.id,
  });

  return getPaymentAccountById(account._id.toString());
}

export async function softDeletePaymentAccount(actor: AuthUser, id: string) {
  await connectDB();

  const account = await PaymentAccountModel.findOne({
    _id: toObjectId(id, "paymentAccountId"),
    isDeleted: false,
  });

  if (!account) {
    throw notFound("Payment account not found");
  }

  // Prevent archiving an account that still holds live group cash
  const summary = await getAccountBalance(account._id);
  if (summary.balance > 0) {
    throw badRequest(
      `Cannot delete "${account.accountName}" while it holds ৳${summary.balance}. Transfer the balance to another account first.`,
    );
  }

  account.isDeleted = true;
  account.isActive = false;
  account.deletedAt = new Date();
  account.deletedBy = toObjectId(actor.id, "actorId");
  await account.save();

  await logActivity({
    entityType: "PAYMENT_ACCOUNT",
    entityId: account._id,
    action: "DELETED",
    summary: `${actor.name} soft-deleted payment account "${account.accountName}"`,
    performedBy: actor.id,
  });

  return { id: account._id.toString(), isDeleted: true };
}

export async function restorePaymentAccount(actor: AuthUser, id: string) {
  await connectDB();

  const account = await PaymentAccountModel.findOne({
    _id: toObjectId(id, "paymentAccountId"),
    isDeleted: true,
  });

  if (!account) {
    throw notFound("Deleted payment account not found");
  }

  account.isDeleted = false;
  account.isActive = true;
  account.deletedAt = null;
  account.deletedBy = null;
  await account.save();

  await logActivity({
    entityType: "PAYMENT_ACCOUNT",
    entityId: account._id,
    action: "RESTORED",
    summary: `${actor.name} restored payment account "${account.accountName}"`,
    performedBy: actor.id,
  });

  return getPaymentAccountById(account._id.toString());
}
