import { sendResponse } from "@/server/core/api-response";
import { badRequest } from "@/server/core/app-error";
import { requireAuth } from "@/server/core/auth-guard";
import { connectDB } from "@/server/core/db";
import { withErrorHandler } from "@/server/core/route-handler";
import { ActivityLogModel } from "@/server/modules/activity-logs/activity-log.model";
import { logActivity } from "@/server/modules/activity-logs/activity-log.service";
import { AccountChargeModel } from "@/server/modules/charges/account-charge.model";
import { DepositModel } from "@/server/modules/deposits/deposit.model";
import { UserModel } from "@/server/modules/members/user.model";
import { MonthlyTargetModel } from "@/server/modules/monthly-targets/monthly-target.model";
import { PaymentAccountModel } from "@/server/modules/payment-accounts/payment-account.model";
import { DepositReturnModel } from "@/server/modules/returns/deposit-return.model";
import { AccountTransferModel } from "@/server/modules/transfers/account-transfer.model";
import { z } from "zod";

const resetTestDataSchema = z.object({
  confirmText: z.string().trim(),
  includeMembers: z.boolean().optional().default(false),
});

/**
 * POST /api/v1/admin/reset-test-data
 * Admin-only utility for wiping ledger test data while always preserving
 * the currently logged-in Admin account.
 */
export const POST = withErrorHandler(async (req) => {
  const actor = await requireAuth(req, ["ADMIN"]);
  const body = resetTestDataSchema.parse(await req.json());

  if (body.confirmText !== "RESET") {
    throw badRequest('Please type "RESET" to confirm cleaning test data');
  }

  await connectDB();

  const [
    depositsRes,
    returnsRes,
    transfersRes,
    chargesRes,
    targetsRes,
    accountsRes,
    logsRes,
  ] = await Promise.all([
    DepositModel.deleteMany({}),
    DepositReturnModel.deleteMany({}),
    AccountTransferModel.deleteMany({}),
    AccountChargeModel.deleteMany({}),
    MonthlyTargetModel.deleteMany({}),
    PaymentAccountModel.deleteMany({}),
    ActivityLogModel.deleteMany({}),
  ]);

  let deletedMembersCount = 0;
  if (body.includeMembers) {
    // Always preserve the currently signed-in Admin account
    const membersRes = await UserModel.deleteMany({ _id: { $ne: actor.id } });
    deletedMembersCount = membersRes.deletedCount || 0;
  }

  await logActivity({
    entityType: "AUTH",
    action: "DELETED",
    summary: body.includeMembers
      ? `${actor.name} cleaned all test ledger data and ${deletedMembersCount} non-admin member(s)`
      : `${actor.name} cleaned all test ledger data (kept members intact)`,
    performedBy: actor.id,
  });

  return sendResponse({
    statusCode: 200,
    message: "Test database cleaned successfully",
    data: {
      deposits: depositsRes.deletedCount || 0,
      returns: returnsRes.deletedCount || 0,
      transfers: transfersRes.deletedCount || 0,
      charges: chargesRes.deletedCount || 0,
      monthlyTargets: targetsRes.deletedCount || 0,
      paymentAccounts: accountsRes.deletedCount || 0,
      activityLogs: logsRes.deletedCount || 0,
      members: deletedMembersCount,
    },
  });
});
