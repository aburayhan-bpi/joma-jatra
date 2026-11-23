import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import {
  createDeposit,
  listDeposits,
} from "@/server/modules/deposits/deposit.service";
import { createDepositSchema } from "@/server/modules/deposits/deposit.validation";
import { parsePaginationQuery } from "@/server/shared/pagination";

export const GET = withErrorHandler(async (req) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const pagination = parsePaginationQuery(req);
  const { searchParams } = new URL(req.url);

  const onlyDeleted =
    actor.role === "ADMIN" && searchParams.get("onlyDeleted") === "true";

  const result = await listDeposits({
    pagination,
    memberId: searchParams.get("memberId") || undefined,
    month: searchParams.get("month") || undefined,
    status: searchParams.get("status") || undefined,
    paymentMethod: searchParams.get("paymentMethod") || undefined,
    paymentAccountId: searchParams.get("paymentAccountId") || undefined,
    onlyDeleted,
  });

  return sendResponse({
    statusCode: 200,
    message: "Deposits fetched successfully",
    meta: result.meta,
    data: result.items,
  });
});

export const POST = withErrorHandler(async (req) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const body = createDepositSchema.parse(await req.json());
  const data = await createDeposit(actor, body);

  return sendResponse({
    statusCode: 201,
    message:
      data.status === "APPROVED"
        ? "Deposit recorded and approved successfully"
        : "Deposit request submitted for approval",
    data,
  });
});
