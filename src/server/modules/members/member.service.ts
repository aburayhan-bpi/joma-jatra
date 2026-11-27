import {
  MemberDeactivateAction,
  PaymentMethodType,
  UserRole,
} from "@/types/backend";
import {
  badRequest,
  conflict,
  notFound,
} from "../../core/app-error";
import { AuthUser } from "../../core/auth-guard";
import { connectDB } from "../../core/db";
import {
  computeReturnNetPayout,
  getAccountBalance,
  getMemberBalance,
  getMemberBalancesMap,
  validateReturnPayoutFee,
} from "../../shared/accounting.service";
import { safeSendEmail } from "../../shared/email";
import {
  buildReturnReceiptEmail,
  buildRoleChangedEmail,
  buildWelcomeMemberEmail,
} from "../../shared/email-templates";
import {
  formatYearMonth,
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
import { ActivityLogModel } from "../activity-logs/activity-log.model";
import { logActivity } from "../activity-logs/activity-log.service";
import { ChargeAllocationModel } from "../charges/charge-allocation.model";
import { DepositModel } from "../deposits/deposit.model";
import { PaymentAccountModel } from "../payment-accounts/payment-account.model";
import { DepositReturnModel } from "../returns/deposit-return.model";
import { UserModel } from "./user.model";

export interface ListMembersParams {
  pagination: PaginationQuery;
  status?: string;
  role?: string;
  onlyDeleted?: boolean;
  includeDeleted?: boolean;
}

/**
 * Lists members with URL pagination, search, role/status/trash filters,
 * and live financial balances (totalDeposited, totalReturned, netBalance).
 */
export async function listMembers({
  pagination,
  status,
  role,
  onlyDeleted = false,
  includeDeleted = false,
}: ListMembersParams) {
  await connectDB();

  const filter: Record<string, unknown> = {
    ...buildSearchFilter(pagination.search, ["name", "email", "phone"]),
  };

  if (onlyDeleted) {
    filter.isDeleted = true;
  } else if (!includeDeleted) {
    filter.isDeleted = false;
  }

  if (status) filter.status = status;
  if (role) filter.role = role;

  const [users, total] = await Promise.all([
    UserModel.find(filter)
      .sort({ joinedAt: 1, createdAt: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    UserModel.countDocuments(filter),
  ]);

  const userIds = users.map((u) => u._id);
  const balancesMap = await getMemberBalancesMap(userIds);

  const items = users.map((u) => {
    const balance = balancesMap.get(u._id.toString()) ?? {
      totalDeposited: 0,
      totalReturned: 0,
      totalDonatedWaived: 0,
      totalCharges: 0,
      netBalance: 0,
      pendingDepositsCount: 0,
      pendingReturnsCount: 0,
    };

    const isFormer = u.isDeleted || u.status === "INACTIVE";
    return {
      ...u,
      id: u._id.toString(),
      financialSummary: balance,
      unsettledPayable: isFormer && balance.netBalance > 0 ? balance.netBalance : 0,
    };
  });

  return {
    items,
    meta: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
}

/**
 * Admin creates a new member account (defaults to MEMBER role).
 */
export async function createMember(
  actor: AuthUser,
  input: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role: UserRole;
    joinedAt?: Date;
    profileImage?: string;
    mustChangePassword?: boolean;
  },
  appBaseUrl?: string,
) {
  await connectDB();

  if (input.role === "ADMIN") {
    throw badRequest(
      "Only one active Admin is allowed. Add this user as Member or Cashier, or transfer Admin later.",
    );
  }

  const existing = await UserModel.findOne({
    email: input.email.toLowerCase(),
  });
  if (existing) {
    throw conflict("A member with this email address already exists");
  }

  const member = await UserModel.create({
    name: input.name,
    email: input.email.toLowerCase(),
    phone: input.phone || "",
    password: input.password,
    role: input.role,
    status: "ACTIVE",
    joinedAt: resolveTransactionDate(input.joinedAt),
    profileImage: input.profileImage || "",
    mustChangePassword: input.mustChangePassword ?? true,
    createdBy: toObjectId(actor.id, "actorId"),
  });

  await logActivity({
    entityType: "USER",
    entityId: member._id,
    targetMemberId: member._id,
    action: "CREATED",
    summary: `${actor.name} added ${member.name} as ${member.role}`,
    performedBy: actor.id,
  });

  // Send welcome email with initial credentials (non-blocking if SMTP fails)
  await safeSendEmail({
    to: member.email,
    ...buildWelcomeMemberEmail({
      name: member.name,
      email: member.email,
      temporaryPassword: input.password,
      role: member.role,
      addedByName: actor.name,
      joinedAt: member.joinedAt,
      appBaseUrl,
    }),
  });

  return {
    id: member._id.toString(),
    name: member.name,
    email: member.email,
    phone: member.phone,
    role: member.role,
    status: member.status,
    joinedAt: member.joinedAt,
    mustChangePassword: member.mustChangePassword,
  };
}

/**
 * Returns full member details with live financial summary.
 */
export async function getMemberDetails(memberId: string) {
  await connectDB();

  const objectId = toObjectId(memberId, "memberId");
  const user = await UserModel.findById(objectId)
    .populate("createdBy", "name email role")
    .populate("deletedBy", "name email role")
    .lean();

  if (!user) {
    throw notFound("Member not found");
  }

  const financialSummary = await getMemberBalance(objectId);
  const isFormer = user.isDeleted || user.status === "INACTIVE";

  return {
    ...user,
    id: user._id.toString(),
    financialSummary,
    unsettledPayable:
      isFormer && financialSummary.netBalance > 0
        ? financialSummary.netBalance
        : 0,
  };
}

/**
 * Admin updates member profile fields and logs changes to the Audit Trail.
 */
export async function updateMember(
  actor: AuthUser,
  memberId: string,
  input: {
    name?: string;
    phone?: string;
    profileImage?: string;
    joinedAt?: Date;
  },
) {
  await connectDB();

  const user = await UserModel.findById(toObjectId(memberId, "memberId"));
  if (!user) {
    throw notFound("Member not found");
  }

  const before = {
    name: user.name,
    phone: user.phone,
    joinedAt: user.joinedAt,
  };

  if (input.name !== undefined) user.name = input.name;
  if (input.phone !== undefined) user.phone = input.phone;
  if (input.profileImage !== undefined) user.profileImage = input.profileImage;
  if (input.joinedAt !== undefined) {
    user.joinedAt = resolveTransactionDate(input.joinedAt);
  }

  await user.save();

  await logActivity({
    entityType: "USER",
    entityId: user._id,
    targetMemberId: user._id,
    action: "UPDATED",
    summary: `${actor.name} updated profile details of ${user.name}`,
    changes: {
      before,
      after: {
        name: user.name,
        phone: user.phone,
        joinedAt: user.joinedAt,
      },
    },
    performedBy: actor.id,
  });

  return getMemberDetails(memberId);
}

/**
 * Admin changes a member's role (MEMBER <-> CASHIER) or atomically transfers
 * the sole ADMIN role to another active member (demoting current Admin to CASHIER or MEMBER).
 * Strictly enforces: exactly 1 active ADMIN exists at all times.
 */
export async function changeMemberRole(
  actor: AuthUser,
  memberId: string,
  newRole: UserRole,
  previousAdminNextRole: "CASHIER" | "MEMBER" = "CASHIER",
) {
  await connectDB();

  const user = await UserModel.findById(toObjectId(memberId, "memberId"));
  if (!user || user.isDeleted || user.status !== "ACTIVE") {
    throw notFound("Active member not found");
  }

  if (user.role === newRole) {
    return getMemberDetails(memberId);
  }

  // Case A: Atomic Single-Admin Transfer to another active member
  if (newRole === "ADMIN") {
    const previousRole = user.role;
    const outgoingAdmins = await UserModel.find({
      _id: { $ne: user._id },
      role: "ADMIN",
      isDeleted: false,
    });

    // Promote the target member to sole ADMIN
    user.role = "ADMIN";
    await user.save();

    // Demote outgoing Admin(s) to chosen role (CASHIER or MEMBER)
    for (const oldAdmin of outgoingAdmins) {
      oldAdmin.role = previousAdminNextRole;
      await oldAdmin.save();

      await logActivity({
        entityType: "USER",
        entityId: oldAdmin._id,
        targetMemberId: oldAdmin._id,
        action: "ROLE_CHANGED",
        summary: `${actor.name} transferred Admin ownership to ${user.name} and stepped down to ${previousAdminNextRole}`,
        changes: {
          before: { role: "ADMIN" },
          after: { role: previousAdminNextRole },
        },
        performedBy: actor.id,
      });

      await safeSendEmail({
        to: oldAdmin.email,
        ...buildRoleChangedEmail({
          memberName: oldAdmin.name,
          previousRole: "ADMIN",
          newRole: previousAdminNextRole,
          changedByName: actor.name,
          isAdminTransfer: true,
        }),
      });
    }

    await logActivity({
      entityType: "USER",
      entityId: user._id,
      targetMemberId: user._id,
      action: "ROLE_CHANGED",
      summary: `${actor.name} transferred Admin ownership to ${user.name} (${previousRole} → ADMIN)`,
      changes: {
        before: { role: previousRole },
        after: { role: "ADMIN" },
      },
      performedBy: actor.id,
    });

    await safeSendEmail({
      to: user.email,
      ...buildRoleChangedEmail({
        memberName: user.name,
        previousRole,
        newRole: "ADMIN",
        changedByName: actor.name,
        isAdminTransfer: true,
      }),
    });

    return getMemberDetails(memberId);
  }

  // Case B: Prevent removing the sole active Admin without transferring first
  if (user.role === "ADMIN") {
    const activeAdminsCount = await UserModel.countDocuments({
      role: "ADMIN",
      status: "ACTIVE",
      isDeleted: false,
    });
    if (activeAdminsCount <= 1) {
      throw badRequest(
        "The group must always have 1 active Admin. Transfer Admin to another active member instead.",
      );
    }
  }

  // Case C: Standard MEMBER <-> CASHIER role change
  const previousRole = user.role;
  user.role = newRole;
  await user.save();

  await logActivity({
    entityType: "USER",
    entityId: user._id,
    targetMemberId: user._id,
    action: "ROLE_CHANGED",
    summary: `${actor.name} changed ${user.name}'s role from ${previousRole} to ${newRole}`,
    changes: {
      before: { role: previousRole },
      after: { role: newRole },
    },
    performedBy: actor.id,
  });

  await safeSendEmail({
    to: user.email,
    ...buildRoleChangedEmail({
      memberName: user.name,
      previousRole,
      newRole,
      changedByName: actor.name,
    }),
  });

  return getMemberDetails(memberId);
}

/**
 * Closes / Deactivates (Soft Deletes) a member with 2-Case Balance Handling:
 * - Safety Check: Blocks if member has any PENDING deposits or returns.
 * - Case 1 (SETTLE_AND_CLOSE): Atomically records FULL_SETTLEMENT return + closes account.
 * - Case 2 (DEACTIVATE_ONLY): Keeps balance flagged as Unsettled Payable + closes account.
 * - Optional (DONATE_AND_CLOSE): Records DONATED_WAIVER return + closes account.
 */
export async function deactivateMember(
  actor: AuthUser,
  memberId: string,
  input: {
    action: MemberDeactivateAction;
    leaveNote?: string;
    paymentAccountId?: string;
    paymentMethod?: PaymentMethodType;
    payoutFee?: number;
    recipientAccount?: string;
    trxId?: string;
    proofImage?: string;
  },
) {
  await connectDB();

  const memberObjectId = toObjectId(memberId, "memberId");
  if (actor.id === memberObjectId.toString()) {
    throw badRequest("You cannot deactivate your own Admin account");
  }

  const user = await UserModel.findById(memberObjectId);
  if (!user) {
    throw notFound("Member not found");
  }
  if (user.isDeleted && user.status === "INACTIVE") {
    throw badRequest("Member account is already deactivated");
  }

  if (user.role === "ADMIN") {
    const activeAdminsCount = await UserModel.countDocuments({
      role: "ADMIN",
      status: "ACTIVE",
      isDeleted: false,
    });
    if (activeAdminsCount <= 1) {
      throw badRequest("Cannot deactivate the last active Admin");
    }
  }

  // Live financial summary & safety check for pending requests
  const balance = await getMemberBalance(memberObjectId);
  if (balance.pendingDepositsCount > 0 || balance.pendingReturnsCount > 0) {
    throw conflict(
      `This member has ${balance.pendingDepositsCount} pending deposit(s) and ${balance.pendingReturnsCount} pending return(s). Please approve or reject them before closing the account.`,
      {
        pendingDepositsCount: balance.pendingDepositsCount,
        pendingReturnsCount: balance.pendingReturnsCount,
      },
    );
  }

  const now = new Date();
  let settlementReturn = null;

  if (balance.netBalance > 0) {
    if (input.action === "SETTLE_AND_CLOSE") {
      if (!input.paymentAccountId) {
        throw badRequest(
          "Payment account is required to settle the member's balance",
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

      const accountSummary = await getAccountBalance(account._id);
      if (accountSummary.balance < balance.netBalance) {
        throw badRequest(
          `Insufficient balance in ${account.accountName} (${account.method}). Available: ৳${accountSummary.balance}, Required: ৳${balance.netBalance}.`,
        );
      }

      const payoutFee = roundMoney(input.payoutFee || 0);
      const feeError = validateReturnPayoutFee(
        balance.netBalance,
        payoutFee,
        "FULL_SETTLEMENT",
      );
      if (feeError) {
        throw badRequest(feeError);
      }
      const netSent = computeReturnNetPayout(balance.netBalance, payoutFee);

      const normalizedTrx = normalizeTrxId(input.trxId);
      if (normalizedTrx) {
        const duplicateTrx = await DepositReturnModel.exists({
          trxId: normalizedTrx,
          isDeleted: false,
          status: { $ne: "REJECTED" },
        });
        if (duplicateTrx) {
          throw conflict(
            `Duplicate TrxID "${normalizedTrx}" already exists on an existing return record.`,
          );
        }
      }

      settlementReturn = await DepositReturnModel.create({
        memberId: memberObjectId,
        amount: balance.netBalance,
        payoutFee,
        returnDate: now,
        paymentMethod: account.method,
        paymentAccountId: account._id,
        recipientAccount: input.recipientAccount || user.phone || "",
        trxId: normalizedTrx,
        proofImage: input.proofImage || "",
        reason: input.leaveNote || "Full settlement on leaving group",
        returnType: "FULL_SETTLEMENT",
        entrySource: "ADMIN_MANUAL",
        status: "APPROVED",
        createdBy: toObjectId(actor.id, "actorId"),
        reviewedBy: toObjectId(actor.id, "actorId"),
        reviewedAt: now,
      });

      await logActivity({
        entityType: "RETURN",
        entityId: settlementReturn._id,
        targetMemberId: memberObjectId,
        action: "SETTLED",
        summary: `${actor.name} settled ৳${balance.netBalance}${payoutFee > 0 ? ` (Net ৳${netSent}, Fee ৳${payoutFee})` : ""} to ${user.name} via ${account.method} (${account.accountName}) while closing account`,
        amount: balance.netBalance,
        proofImage: input.proofImage || null,
        performedBy: actor.id,
      });

      await safeSendEmail({
        to: user.email,
        ...buildReturnReceiptEmail({
          memberName: user.name,
          status: "APPROVED",
          amount: balance.netBalance,
          payoutFee,
          returnType: "FULL_SETTLEMENT",
          returnDate: now,
          paymentAccountName: account.accountName,
          paymentMethod: account.method,
          recipientAccount: input.recipientAccount || user.phone || "",
          trxId: settlementReturn.trxId,
          reviewedByName: actor.name,
          newNetBalance: 0,
        }),
      });
    } else if (input.action === "DONATE_AND_CLOSE") {
      settlementReturn = await DepositReturnModel.create({
        memberId: memberObjectId,
        amount: balance.netBalance,
        returnDate: now,
        paymentMethod: null,
        paymentAccountId: null,
        reason:
          input.leaveNote || "Remaining balance waived/donated to group fund",
        returnType: "DONATED_WAIVER",
        entrySource: "ADMIN_MANUAL",
        status: "APPROVED",
        createdBy: toObjectId(actor.id, "actorId"),
        reviewedBy: toObjectId(actor.id, "actorId"),
        reviewedAt: now,
      });

      await logActivity({
        entityType: "RETURN",
        entityId: settlementReturn._id,
        targetMemberId: memberObjectId,
        action: "SETTLED",
        summary: `${user.name}'s remaining ৳${balance.netBalance} was waived/donated to the group fund on leaving`,
        amount: balance.netBalance,
        performedBy: actor.id,
      });

      await safeSendEmail({
        to: user.email,
        ...buildReturnReceiptEmail({
          memberName: user.name,
          status: "APPROVED",
          amount: balance.netBalance,
          returnType: "DONATED_WAIVER",
          returnDate: now,
          reviewedByName: actor.name,
          newNetBalance: 0,
        }),
      });
    }
  }

  // Soft-delete & deactivate user account
  user.status = "INACTIVE";
  user.isDeleted = true;
  user.leftAt = now;
  user.leaveNote = input.leaveNote || null;
  user.deletedAt = now;
  user.deletedBy = toObjectId(actor.id, "actorId");
  await user.save();

  const summaryNote =
    balance.netBalance > 0 && input.action === "DEACTIVATE_ONLY"
      ? `${actor.name} deactivated ${user.name} with unsettled balance ৳${balance.netBalance}`
      : `${actor.name} deactivated ${user.name}'s account`;

  await logActivity({
    entityType: "USER",
    entityId: user._id,
    targetMemberId: user._id,
    action: "DEACTIVATED",
    summary: summaryNote,
    amount: balance.netBalance > 0 ? balance.netBalance : null,
    changes: {
      before: { status: "ACTIVE", isDeleted: false },
      after: {
        status: "INACTIVE",
        isDeleted: true,
        action: input.action,
        leaveNote: input.leaveNote || null,
      },
    },
    performedBy: actor.id,
  });

  const updatedDetails = await getMemberDetails(memberId);
  return {
    member: updatedDetails,
    settlementReturn,
  };
}

/**
 * Restores a soft-deleted / deactivated member back to ACTIVE status with full history intact.
 */
export async function restoreMember(actor: AuthUser, memberId: string) {
  await connectDB();

  const user = await UserModel.findById(toObjectId(memberId, "memberId"));
  if (!user) {
    throw notFound("Member not found");
  }

  // Preserve strictly-1-active-Admin invariant if a former Admin is restored
  let demotedFromAdmin = false;
  if (user.role === "ADMIN") {
    const otherActiveAdmin = await UserModel.exists({
      _id: { $ne: user._id },
      role: "ADMIN",
      status: "ACTIVE",
      isDeleted: false,
    });
    if (otherActiveAdmin) {
      user.role = "MEMBER";
      demotedFromAdmin = true;
    }
  }

  user.status = "ACTIVE";
  user.isDeleted = false;
  user.leftAt = null;
  user.deletedAt = null;
  user.deletedBy = null;
  await user.save();

  await logActivity({
    entityType: "USER",
    entityId: user._id,
    targetMemberId: user._id,
    action: "RESTORED",
    summary: demotedFromAdmin
      ? `${actor.name} restored and reactivated ${user.name} as MEMBER (another active Admin already exists)`
      : `${actor.name} restored and reactivated ${user.name}`,
    performedBy: actor.id,
  });

  return getMemberDetails(memberId);
}

export interface MemberAuditTrailEntry {
  id: string;
  eventCategory: "DEPOSIT" | "RETURN" | "CHARGE" | "LIFECYCLE";
  eventType: string;
  action: string;
  summary: string;
  date: Date;
  month: string | null;
  amount: number | null;
  payoutFee?: number;
  allocationMode?: "PRO_RATA_ACTIVE" | "DIRECT_MEMBER";
  sharePercent?: number;
  memberBalanceSnapshot?: number;
  eligibleTotalSnapshot?: number;
  direction: "CREDIT" | "DEBIT" | "NEUTRAL";
  paymentMethod: string | null;
  paymentAccountName: string | null;
  trxId: string | null;
  status: string | null;
  entrySource: string | null;
  proofImage: string | null;
  note: string | null;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  } | null;
  performedBy: { id: string; name: string; role: string } | null;
  reviewedBy: { id: string; name: string; role: string } | null;
}

/**
 * Builds a complete, paginated, filterable Audit Trail for a single member
 * combining all Deposits, Returns/Settlements, Charge Allocations, and Lifecycle Activity Logs.
 */
export async function getMemberAuditTrail(
  memberId: string,
  params: {
    pagination: PaginationQuery;
    category?: string; // DEPOSIT | RETURN | CHARGE | LIFECYCLE
    status?: string;
    month?: string;
  },
) {
  await connectDB();

  const memberObjectId = toObjectId(memberId, "memberId");
  const memberExists = await UserModel.exists({ _id: memberObjectId });
  if (!memberExists) {
    throw notFound("Member not found");
  }

  const [deposits, returns, chargeAllocations, userLogs] = await Promise.all([
    DepositModel.find({ memberId: memberObjectId, isDeleted: false })
      .populate("paymentAccountId", "accountName method")
      .populate("createdBy", "name role")
      .populate("reviewedBy", "name role")
      .lean(),
    DepositReturnModel.find({ memberId: memberObjectId, isDeleted: false })
      .populate("paymentAccountId", "accountName method")
      .populate("createdBy", "name role")
      .populate("reviewedBy", "name role")
      .lean(),
    ChargeAllocationModel.find({ memberId: memberObjectId, isDeleted: false }).lean(),
    ActivityLogModel.find({
      targetMemberId: memberObjectId,
      $or: [
        { entityType: { $in: ["USER", "AUTH"] } },
        {
          entityType: { $in: ["DEPOSIT", "RETURN"] },
          action: { $in: ["UPDATED", "DELETED", "RESTORED"] },
        },
      ],
    })
      .populate("performedBy", "name role")
      .lean(),
  ]);

  const toActor = (
    doc: unknown,
  ): { id: string; name: string; role: string } | null => {
    if (!doc || typeof doc !== "object" || !("_id" in doc)) return null;
    const u = doc as { _id: { toString(): string }; name?: string; role?: string };
    return {
      id: u._id.toString(),
      name: u.name || "Unknown",
      role: u.role || "MEMBER",
    };
  };

  const timeline: MemberAuditTrailEntry[] = [];

  for (const dep of deposits) {
    const acc = dep.paymentAccountId as unknown as
      | { accountName?: string; method?: string }
      | null;
    timeline.push({
      id: dep._id.toString(),
      eventCategory: "DEPOSIT",
      eventType: "DEPOSIT",
      action: dep.status,
      summary:
        dep.note ||
        `Deposit for ${dep.month} via ${dep.paymentMethod}`,
      // Order by latest milestone (approval/rejection if reviewed, otherwise submission time)
      date: dep.reviewedAt || dep.createdAt || dep.depositDate,
      month: dep.month,
      amount: dep.amount,
      direction: "CREDIT",
      paymentMethod: dep.paymentMethod,
      paymentAccountName: acc?.accountName || null,
      trxId: dep.trxId || null,
      status: dep.status,
      entrySource: dep.entrySource,
      proofImage: dep.proofImage || null,
      note: dep.rejectionReason || dep.note || null,
      performedBy: toActor(dep.createdBy),
      reviewedBy: toActor(dep.reviewedBy),
    });
  }

  for (const ret of returns) {
    const acc = ret.paymentAccountId as unknown as
      | { accountName?: string; method?: string }
      | null;
    // Order by latest milestone (approval/rejection if reviewed, otherwise request time)
    const retDate = ret.reviewedAt || ret.createdAt || ret.returnDate;
    const retMonth = formatYearMonth(retDate);

    timeline.push({
      id: ret._id.toString(),
      eventCategory: "RETURN",
      eventType: ret.returnType,
      action: ret.status,
      summary:
        ret.reason ||
        (ret.returnType === "FULL_SETTLEMENT"
          ? "Full account settlement"
          : ret.returnType === "DONATED_WAIVER"
            ? "Balance donated/waived to group fund"
            : "Deposit return / refund"),
      date: retDate,
      month: retMonth,
      amount: ret.amount,
      payoutFee: ret.payoutFee || 0,
      direction: "DEBIT",
      paymentMethod: ret.paymentMethod || null,
      paymentAccountName: acc?.accountName || null,
      trxId: ret.trxId || null,
      status: ret.status,
      entrySource: ret.entrySource,
      proofImage: ret.proofImage || null,
      note: ret.rejectionReason || ret.reason || null,
      performedBy: toActor(ret.createdBy),
      reviewedBy: toActor(ret.reviewedBy),
    });
  }

  for (const alloc of chargeAllocations) {
    const allocDate = alloc.chargeDate || alloc.createdAt;
    const isDirect = alloc.allocationMode === "DIRECT_MEMBER";
    timeline.push({
      id: alloc._id.toString(),
      eventCategory: "CHARGE",
      eventType: alloc.sourceType,
      action: isDirect ? "DIRECT_FEE" : "PRO_RATA_SHARE",
      summary: alloc.title,
      date: allocDate,
      month: formatYearMonth(allocDate),
      amount: alloc.allocatedAmount,
      allocationMode: alloc.allocationMode,
      sharePercent: alloc.sharePercent,
      memberBalanceSnapshot: alloc.memberBalanceSnapshot,
      eligibleTotalSnapshot: alloc.eligibleTotalSnapshot,
      direction: "DEBIT",
      paymentMethod: null,
      paymentAccountName: null,
      trxId: null,
      status: "APPROVED",
      entrySource: alloc.sourceType,
      proofImage: null,
      note: isDirect
        ? `Dedicated transfer fee (৳${alloc.totalChargeAmount}) applied to your balance`
        : `${alloc.sharePercent.toFixed(2)}% of ৳${alloc.totalChargeAmount} (your balance ৳${alloc.memberBalanceSnapshot} / ৳${alloc.eligibleTotalSnapshot} active total)`,
      performedBy: null,
      reviewedBy: null,
    });
  }

  for (const log of userLogs) {
    const logDate = log.createdAt;
    const logMonth = formatYearMonth(logDate);
    timeline.push({
      id: log._id.toString(),
      eventCategory: "LIFECYCLE",
      eventType: log.entityType,
      action: log.action,
      summary: log.summary,
      date: logDate,
      month: logMonth,
      amount: log.amount ?? null,
      direction: "NEUTRAL",
      paymentMethod: null,
      paymentAccountName: null,
      trxId: null,
      status: log.action,
      entrySource: null,
      proofImage: log.proofImage || null,
      note: null,
      changes: log.changes || null,
      performedBy: toActor(log.performedBy),
      reviewedBy: null,
    });
  }

  // Apply category, status, month, and search filters
  const searchLower = params.pagination.search.toLowerCase();
  const filtered = timeline
    .filter((entry) => {
      if (params.category && entry.eventCategory !== params.category) {
        return false;
      }
      if (params.status && entry.status !== params.status) {
        return false;
      }
      if (params.month && entry.month !== params.month) {
        return false;
      }
      if (searchLower) {
        const haystack = [
          entry.summary,
          entry.trxId,
          entry.paymentMethod,
          entry.paymentAccountName,
          entry.note,
          entry.eventType,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(searchLower)) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const total = filtered.length;
  const paginatedItems = filtered.slice(
    params.pagination.skip,
    params.pagination.skip + params.pagination.limit,
  );

  return {
    items: paginatedItems,
    meta: buildPaginationMeta(
      total,
      params.pagination.page,
      params.pagination.limit,
    ),
  };
}
