import {
  EntrySource,
  PaymentMethodType,
  ReturnType,
  TransactionStatus,
} from "@/types/backend";
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
import { safeSendEmail } from "../../shared/email";
import { buildReturnReceiptEmail } from "../../shared/email-templates";
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
import { UserModel } from "../members/user.model";
import { PaymentAccountModel } from "../payment-accounts/payment-account.model";
import { DepositReturnModel } from "./deposit-return.model";

export interface ListReturnsParams {
  pagination: PaginationQuery;
  memberId?: string;
  status?: string;
  returnType?: string;
  paymentMethod?: string;
  onlyDeleted?: boolean;
}

export async function listReturns({
  pagination,
  memberId,
  status,
  returnType,
  paymentMethod,
  onlyDeleted = false,
}: ListReturnsParams) {
  await connectDB();

  const filter: Record<string, unknown> = {
    isDeleted: onlyDeleted,
    ...buildSearchFilter(pagination.search, [
      "trxId",
      "reason",
      "recipientAccount",
    ]),
  };

  if (memberId) filter.memberId = toObjectId(memberId, "memberId");
  if (status) filter.status = status;
  if (returnType) filter.returnType = returnType;
  if (paymentMethod) filter.paymentMethod = paymentMethod;

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
    DepositReturnModel.find(filter)
      .sort({ returnDate: -1, createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("memberId", "name email phone role status isDeleted")
      .populate("paymentAccountId", "accountName accountNumber method")
      .populate("createdBy", "name role")
      .populate("reviewedBy", "name role")
      .lean(),
    DepositReturnModel.countDocuments(filter),
  ]);

  return {
    items: items.map((r) => ({ ...r, id: r._id.toString() })),
    meta: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
}

/**
 * Prevents duplicate TrxID across active (non-deleted, non-rejected) return records.
 */
async function ensureUniqueReturnTrxId(trxId?: string, excludeId?: string) {
  if (!trxId) return;
  const query: Record<string, unknown> = {
    trxId,
    isDeleted: false,
    status: { $ne: "REJECTED" },
  };
  if (excludeId) {
    query._id = { $ne: toObjectId(excludeId, "returnId") };
  }
  const existing = await DepositReturnModel.findOne(query).select("_id").lean();
  if (existing) {
    throw conflict(
      `Duplicate TrxID "${trxId}" already exists on an existing return record. Please verify the transaction reference.`,
    );
  }
}

export async function getReturnById(
  id: string,
  options?: { includeDeleted?: boolean },
) {
  await connectDB();

  const filter: Record<string, unknown> = { _id: toObjectId(id, "returnId") };
  if (!options?.includeDeleted) {
    filter.isDeleted = false;
  }

  const item = await DepositReturnModel.findOne(filter)
    .populate("memberId", "name email phone role status isDeleted")
    .populate("paymentAccountId", "accountName accountNumber method")
    .populate("createdBy", "name role")
    .populate("reviewedBy", "name role")
    .lean();

  if (!item) {
    throw notFound("Return record not found");
  }

  return { ...item, id: item._id.toString() };
}

/**
 * Creates a deposit return / refund / post-close settlement entry:
 * - Enforces Member Net Balance guard (amount <= member netBalance)
 * - Enforces Source Account Balance guard on auto-approved payouts
 * - Supports settling inactive/former members with unsettled payable balance
 */
export async function createReturn(
  actor: AuthUser,
  input: {
    memberId?: string;
    amount: number;
    returnDate?: Date;
    paymentAccountId?: string;
    paymentMethod?: PaymentMethodType;
    recipientAccount?: string;
    trxId?: string;
    proofImage?: string;
    reason?: string;
    returnType?: ReturnType;
  },
) {
  await connectDB();

  const canEnterForOthers = actor.role === "ADMIN" || actor.role === "CASHIER";
  const targetMemberId =
    canEnterForOthers && input.memberId ? input.memberId : actor.id;

  // Note: Inactive/former members ARE allowed to receive returns from Admin/Cashier to settle unsettled balances
  const targetMember = await UserModel.findById(
    toObjectId(targetMemberId, "memberId"),
  );
  if (!targetMember) {
    throw notFound("Member not found");
  }

  // Validate against live member net balance minus any existing PENDING return requests
  const [memberBalance, pendingReturnsAgg] = await Promise.all([
    getMemberBalance(targetMember._id),
    DepositReturnModel.aggregate<{ _id: null; total: number }>([
      {
        $match: {
          memberId: targetMember._id,
          status: "PENDING",
          isDeleted: false,
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const existingPendingReturns = roundMoney(pendingReturnsAgg[0]?.total || 0);
  const availableForReturn = roundMoney(
    memberBalance.netBalance - existingPendingReturns,
  );

  if (input.amount > availableForReturn) {
    throw badRequest(
      existingPendingReturns > 0
        ? `Return amount (৳${input.amount}) exceeds available balance. Net balance: ৳${memberBalance.netBalance}, Pending return requests: ৳${existingPendingReturns}, Available: ৳${availableForReturn}.`
        : `Return amount (৳${input.amount}) exceeds ${targetMember.name}'s available net balance (৳${memberBalance.netBalance}).`,
    );
  }

  const isSelfEntry = targetMember._id.toString() === actor.id;
  // Cashiers requesting a return for themselves follow regular member rules (pending, no custom date/waiver)
  const canAutoProcess =
    actor.role === "ADMIN" || (actor.role === "CASHIER" && !isSelfEntry);

  let status: TransactionStatus = "PENDING";
  let entrySource: EntrySource = "MEMBER_REQUEST";
  let reviewedBy = null;
  let reviewedAt = null;

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

  const amount = roundMoney(input.amount);
  const returnType: ReturnType =
    canAutoProcess && input.returnType
      ? input.returnType
      : amount === memberBalance.netBalance
        ? "FULL_SETTLEMENT"
        : "PARTIAL";

  let paymentAccountObjectId = null;
  let resolvedMethod: PaymentMethodType | null = input.paymentMethod || null;

  if (returnType !== "DONATED_WAIVER") {
    if (status === "APPROVED") {
      if (!input.paymentAccountId) {
        throw badRequest(
          "Please select the Payment Account from which the return is being paid",
        );
      }

      const account = await PaymentAccountModel.findOne({
        _id: toObjectId(input.paymentAccountId, "paymentAccountId"),
        isDeleted: false,
      });
      if (!account) {
        throw notFound("Selected payment account not found");
      }

      if (input.paymentMethod && input.paymentMethod !== account.method) {
        throw badRequest(
          `Payment method (${input.paymentMethod}) does not match selected account "${account.accountName}" (${account.method}).`,
        );
      }

      const accSummary = await getAccountBalance(account._id);
      if (accSummary.balance < amount) {
        throw badRequest(
          `Insufficient balance in ${account.accountName} (${account.method}). Available: ৳${accSummary.balance}, Required: ৳${amount}.`,
        );
      }

      paymentAccountObjectId = account._id;
      resolvedMethod = account.method;
    } else if (input.paymentAccountId) {
      const account = await PaymentAccountModel.findOne({
        _id: toObjectId(input.paymentAccountId, "paymentAccountId"),
        isDeleted: false,
      });
      if (!account) {
        throw notFound("Selected payment account not found");
      }
      if (input.paymentMethod && input.paymentMethod !== account.method) {
        throw badRequest(
          `Payment method (${input.paymentMethod}) does not match selected account "${account.accountName}" (${account.method}).`,
        );
      }
      paymentAccountObjectId = account._id;
      resolvedMethod = account.method;
    }
  } else {
    resolvedMethod = null;
  }

  const normalizedTrx = normalizeTrxId(input.trxId);
  await ensureUniqueReturnTrxId(normalizedTrx);

  const record = await DepositReturnModel.create({
    memberId: targetMember._id,
    amount,
    returnDate: canAutoProcess
      ? resolveTransactionDate(input.returnDate)
      : new Date(),
    paymentMethod: resolvedMethod,
    paymentAccountId: paymentAccountObjectId,
    recipientAccount: input.recipientAccount || targetMember.phone || "",
    trxId: normalizedTrx,
    proofImage: input.proofImage || "",
    reason: input.reason || "",
    returnType,
    entrySource,
    status,
    createdBy: toObjectId(actor.id, "actorId"),
    reviewedBy,
    reviewedAt,
  });

  await logActivity({
    entityType: "RETURN",
    entityId: record._id,
    targetMemberId: targetMember._id,
    action:
      status === "APPROVED"
        ? returnType === "FULL_SETTLEMENT" || returnType === "DONATED_WAIVER"
          ? "SETTLED"
          : "APPROVED"
        : "CREATED",
    summary:
      status === "APPROVED"
        ? `${actor.name} processed ৳${record.amount} (${returnType}) for ${targetMember.name}`
        : `${actor.name} requested a return of ৳${record.amount}`,
    amount: record.amount,
    proofImage: record.proofImage || null,
    performedBy: actor.id,
  });

  if (status === "APPROVED" && targetMember.email) {
    const [updatedBalance, accountDoc] = await Promise.all([
      getMemberBalance(targetMember._id),
      record.paymentAccountId
        ? PaymentAccountModel.findById(record.paymentAccountId)
            .select("accountName")
            .lean()
        : Promise.resolve(null),
    ]);

    await safeSendEmail({
      to: targetMember.email,
      ...buildReturnReceiptEmail({
        memberName: targetMember.name,
        status: "APPROVED",
        amount: record.amount,
        returnType: record.returnType,
        returnDate: record.returnDate,
        paymentAccountName: accountDoc?.accountName || null,
        paymentMethod: record.paymentMethod || null,
        recipientAccount: record.recipientAccount || null,
        trxId: record.trxId,
        reviewedByName: actor.name,
        newNetBalance: updatedBalance.netBalance,
      }),
    });
  }

  return getReturnById(record._id.toString());
}

/**
 * Updates a PENDING return request (Owner for PENDING; Admin for PENDING).
 */
export async function updateReturn(
  actor: AuthUser,
  id: string,
  input: {
    amount?: number;
    recipientAccount?: string;
    reason?: string;
    paymentAccountId?: string;
    paymentMethod?: PaymentMethodType;
    trxId?: string;
    proofImage?: string;
  },
) {
  await connectDB();

  const record = await DepositReturnModel.findOne({
    _id: toObjectId(id, "returnId"),
    isDeleted: false,
  });
  if (!record) throw notFound("Return record not found");

  const isOwner = record.memberId.toString() === actor.id;
  if (actor.role !== "ADMIN" && (!isOwner || record.status !== "PENDING")) {
    throw forbidden(
      "Only your own PENDING return requests can be edited. Approved returns are locked.",
    );
  }

  if (record.status === "REJECTED") {
    throw badRequest(
      "Rejected return requests cannot be edited. Create a new return request if needed.",
    );
  }

  const before = {
    amount: record.amount,
    recipientAccount: record.recipientAccount || "",
    reason: record.reason || "",
    paymentAccountId: record.paymentAccountId?.toString() || null,
    paymentMethod: record.paymentMethod || null,
    trxId: record.trxId || null,
    proofImage: record.proofImage || "",
  };

  if (input.amount !== undefined) {
    if (record.status !== "PENDING") {
      throw badRequest(
        "Amount cannot be edited after a return is approved or rejected. Soft-delete and create a corrected entry if needed.",
      );
    }
    const nextAmount = roundMoney(input.amount);
    const [balance, otherPendingAgg] = await Promise.all([
      getMemberBalance(record.memberId),
      DepositReturnModel.aggregate<{ _id: null; total: number }>([
        {
          $match: {
            _id: { $ne: record._id },
            memberId: record.memberId,
            status: "PENDING",
            isDeleted: false,
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);
    const otherPending = roundMoney(otherPendingAgg[0]?.total || 0);
    const maxAllowed = roundMoney(balance.netBalance - otherPending);
    if (nextAmount > maxAllowed) {
      throw badRequest(
        `Return amount (৳${nextAmount}) exceeds available balance (৳${maxAllowed}).`,
      );
    }
    record.amount = nextAmount;
  }

  if (input.recipientAccount !== undefined) {
    record.recipientAccount = input.recipientAccount;
  }
  if (input.reason !== undefined) record.reason = input.reason;
  if (input.trxId !== undefined) {
    const normalizedTrx = normalizeTrxId(input.trxId);
    await ensureUniqueReturnTrxId(normalizedTrx, record._id.toString());
    record.trxId = normalizedTrx;
  }
  if (input.proofImage !== undefined) record.proofImage = input.proofImage;

  // Never assign a payment account or method onto a DONATED_WAIVER record
  if (record.returnType === "DONATED_WAIVER") {
    if (input.paymentAccountId || input.paymentMethod) {
      throw badRequest(
        "Cannot assign a payment account or payment method to a donated waiver record.",
      );
    }
  } else if (input.paymentAccountId) {
    const acc = await PaymentAccountModel.findOne({
      _id: toObjectId(input.paymentAccountId, "paymentAccountId"),
      isDeleted: false,
    });
    if (!acc) throw notFound("Payment account not found");
    if (input.paymentMethod && input.paymentMethod !== acc.method) {
      throw badRequest(
        `Payment method (${input.paymentMethod}) does not match selected account "${acc.accountName}" (${acc.method}).`,
      );
    }
    if (
      record.status === "APPROVED" &&
      record.paymentAccountId?.toString() !== acc._id.toString()
    ) {
      const targetAccBalance = await getAccountBalance(acc._id);
      if (targetAccBalance.balance < record.amount) {
        throw badRequest(
          `Insufficient balance in ${acc.accountName} (${acc.method}). Available: ৳${targetAccBalance.balance}, Required: ৳${record.amount}.`,
        );
      }
    }
    record.paymentAccountId = acc._id;
    record.paymentMethod = acc.method;
  } else if (input.paymentMethod) {
    if (
      record.paymentAccountId &&
      input.paymentMethod !== record.paymentMethod
    ) {
      throw badRequest(
        "To change payment method, please select a matching paymentAccountId.",
      );
    }
    if (record.status === "PENDING") {
      record.paymentMethod = input.paymentMethod;
    }
  }

  await record.save();

  await logActivity({
    entityType: "RETURN",
    entityId: record._id,
    targetMemberId: record.memberId,
    action: "UPDATED",
    summary: `${actor.name} updated return request (৳${record.amount})`,
    amount: record.amount,
    proofImage: record.proofImage || null,
    changes: {
      before,
      after: {
        amount: record.amount,
        recipientAccount: record.recipientAccount || "",
        reason: record.reason || "",
        paymentAccountId: record.paymentAccountId?.toString() || null,
        paymentMethod: record.paymentMethod || null,
        trxId: record.trxId || null,
        proofImage: record.proofImage || "",
      },
    },
    performedBy: actor.id,
  });

  return getReturnById(record._id.toString());
}

/**
 * Approves or rejects a PENDING return request with live double-balance validation
 * and anti-self-approval guard for Cashiers.
 */
export async function reviewReturn(
  actor: AuthUser,
  id: string,
  input: {
    status: "APPROVED" | "REJECTED";
    rejectionReason?: string;
    paymentAccountId?: string;
    paymentMethod?: PaymentMethodType;
    trxId?: string;
    proofImage?: string;
  },
) {
  await connectDB();

  const record = await DepositReturnModel.findOne({
    _id: toObjectId(id, "returnId"),
    isDeleted: false,
  });
  if (!record) throw notFound("Return request not found");

  if (record.status !== "PENDING") {
    throw badRequest(`This return request has already been ${record.status}`);
  }

  if (actor.role === "CASHIER" && record.memberId.toString() === actor.id) {
    throw forbidden(
      "Cashiers cannot approve or reject their own return requests. Please ask an Admin.",
    );
  }

  const setFields: Record<string, unknown> = {
    status: input.status,
    reviewedBy: toObjectId(actor.id, "actorId"),
    reviewedAt: new Date(),
  };

  if (input.status === "APPROVED") {
    // Re-verify live member net balance
    const memberBalance = await getMemberBalance(record.memberId);
    if (record.amount > memberBalance.netBalance) {
      throw badRequest(
        `Cannot approve: member's current net balance is ৳${memberBalance.netBalance}, which is less than ৳${record.amount}.`,
      );
    }

    if (record.returnType !== "DONATED_WAIVER") {
      const targetAccountId =
        input.paymentAccountId || record.paymentAccountId?.toString();
      if (!targetAccountId) {
        throw badRequest(
          "Please select the Payment Account used to disburse this return",
        );
      }

      const account = await PaymentAccountModel.findOne({
        _id: toObjectId(targetAccountId, "paymentAccountId"),
        isDeleted: false,
      });
      if (!account) throw notFound("Selected payment account not found");

      if (input.paymentMethod && input.paymentMethod !== account.method) {
        throw badRequest(
          `Payment method (${input.paymentMethod}) does not match selected account "${account.accountName}" (${account.method}).`,
        );
      }

      const accountBalance = await getAccountBalance(account._id);
      if (accountBalance.balance < record.amount) {
        throw badRequest(
          `Insufficient balance in ${account.accountName} (${account.method}). Available: ৳${accountBalance.balance}, Required: ৳${record.amount}.`,
        );
      }

      setFields.paymentAccountId = account._id;
      setFields.paymentMethod = account.method;
    }

    if (input.trxId !== undefined) {
      const normalizedTrx = normalizeTrxId(input.trxId);
      await ensureUniqueReturnTrxId(normalizedTrx, record._id.toString());
      setFields.trxId = normalizedTrx;
    }
    if (input.proofImage !== undefined) setFields.proofImage = input.proofImage;
    setFields.rejectionReason = null;
  } else {
    setFields.rejectionReason = input.rejectionReason || "Rejected";
  }

  // Atomic conditional transition prevents concurrent double-approvals and duplicate emails
  const updatedRecord = await DepositReturnModel.findOneAndUpdate(
    { _id: record._id, status: "PENDING", isDeleted: false },
    { $set: setFields },
    { new: true },
  );
  if (!updatedRecord) {
    throw badRequest(
      "This return request has already been reviewed by another manager",
    );
  }

  const [member, accountDoc] = await Promise.all([
    UserModel.findById(updatedRecord.memberId).select("name email").lean(),
    updatedRecord.paymentAccountId
      ? PaymentAccountModel.findById(updatedRecord.paymentAccountId)
          .select("accountName")
          .lean()
      : Promise.resolve(null),
  ]);

  await logActivity({
    entityType: "RETURN",
    entityId: updatedRecord._id,
    targetMemberId: updatedRecord.memberId,
    action: input.status,
    summary:
      input.status === "APPROVED"
        ? `${actor.name} approved ৳${updatedRecord.amount} return to ${member?.name || "Member"}`
        : `${actor.name} rejected ৳${updatedRecord.amount} return request from ${member?.name || "Member"} — ${updatedRecord.rejectionReason}`,
    amount: updatedRecord.amount,
    proofImage: updatedRecord.proofImage || null,
    performedBy: actor.id,
  });

  if (member?.email) {
    const updatedBalance =
      input.status === "APPROVED"
        ? await getMemberBalance(updatedRecord.memberId)
        : null;
    await safeSendEmail({
      to: member.email,
      ...buildReturnReceiptEmail({
        memberName: member.name,
        status: input.status,
        amount: updatedRecord.amount,
        returnType: updatedRecord.returnType,
        returnDate: updatedRecord.returnDate,
        paymentAccountName: accountDoc?.accountName || null,
        paymentMethod: updatedRecord.paymentMethod || null,
        recipientAccount: updatedRecord.recipientAccount || null,
        trxId: updatedRecord.trxId,
        reviewedByName: actor.name,
        rejectionReason: updatedRecord.rejectionReason,
        newNetBalance: updatedBalance?.netBalance,
      }),
    });
  }

  return getReturnById(updatedRecord._id.toString());
}

export async function softDeleteReturn(actor: AuthUser, id: string) {
  await connectDB();

  const record = await DepositReturnModel.findOne({
    _id: toObjectId(id, "returnId"),
    isDeleted: false,
  });
  if (!record) throw notFound("Return record not found");

  const isOwner = record.memberId.toString() === actor.id;
  if (actor.role !== "ADMIN") {
    if (!isOwner || record.status !== "PENDING") {
      throw forbidden("You can only cancel your own PENDING return requests");
    }
  }

  record.isDeleted = true;
  record.deletedAt = new Date();
  record.deletedBy = toObjectId(actor.id, "actorId");
  await record.save();

  await logActivity({
    entityType: "RETURN",
    entityId: record._id,
    targetMemberId: record.memberId,
    action: "DELETED",
    summary: `${actor.name} deleted/cancelled ৳${record.amount} return record`,
    amount: record.amount,
    performedBy: actor.id,
  });

  return { id: record._id.toString(), isDeleted: true };
}

export async function restoreReturn(actor: AuthUser, id: string) {
  await connectDB();

  const record = await DepositReturnModel.findOne({
    _id: toObjectId(id, "returnId"),
    isDeleted: true,
  });
  if (!record) throw notFound("Deleted return record not found");

  if (record.trxId && record.status !== "REJECTED") {
    await ensureUniqueReturnTrxId(record.trxId, record._id.toString());
  }

  // Ensure referenced payment account is not soft-deleted
  if (record.returnType !== "DONATED_WAIVER" && record.paymentAccountId) {
    const accountExists = await PaymentAccountModel.exists({
      _id: record.paymentAccountId,
      isDeleted: false,
    });
    if (!accountExists) {
      throw badRequest(
        "Cannot restore return: its payment account is currently in Trash. Restore the payment account first.",
      );
    }
  }

  // Re-validate balances if restoring an APPROVED or PENDING return
  if (record.status === "APPROVED") {
    const memberBalance = await getMemberBalance(record.memberId);
    if (record.amount > memberBalance.netBalance) {
      throw badRequest(
        `Cannot restore: member's net balance (৳${memberBalance.netBalance}) is less than ৳${record.amount}.`,
      );
    }
    if (record.returnType !== "DONATED_WAIVER" && record.paymentAccountId) {
      const accountBalance = await getAccountBalance(record.paymentAccountId);
      if (accountBalance.balance < record.amount) {
        throw badRequest(
          `Cannot restore: source payment account balance (৳${accountBalance.balance}) is less than ৳${record.amount}.`,
        );
      }
    }
  } else if (record.status === "PENDING") {
    const memberActive = await UserModel.exists({
      _id: record.memberId,
      isDeleted: false,
      status: "ACTIVE",
    });
    if (!memberActive) {
      throw badRequest(
        "Cannot restore a pending return request for a deactivated member. Restore the member first.",
      );
    }
    const [memberBalance, otherPendingAgg] = await Promise.all([
      getMemberBalance(record.memberId),
      DepositReturnModel.aggregate<{ _id: null; total: number }>([
        {
          $match: {
            _id: { $ne: record._id },
            memberId: record.memberId,
            status: "PENDING",
            isDeleted: false,
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);
    const otherPending = roundMoney(otherPendingAgg[0]?.total || 0);
    const available = roundMoney(memberBalance.netBalance - otherPending);
    if (record.amount > available) {
      throw badRequest(
        `Cannot restore pending return: member only has ৳${available} available after other pending returns.`,
      );
    }
  }

  record.isDeleted = false;
  record.deletedAt = null;
  record.deletedBy = null;
  await record.save();

  await logActivity({
    entityType: "RETURN",
    entityId: record._id,
    targetMemberId: record.memberId,
    action: "RESTORED",
    summary: `${actor.name} restored ৳${record.amount} return record`,
    amount: record.amount,
    performedBy: actor.id,
  });

  return getReturnById(record._id.toString());
}
