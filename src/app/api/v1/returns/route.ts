import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import {
  createReturn,
  listReturns,
} from "@/server/modules/returns/deposit-return.service";
import { createReturnSchema } from "@/server/modules/returns/deposit-return.validation";
import { parsePaginationQuery } from "@/server/shared/pagination";

export const GET = withErrorHandler(async (req) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const pagination = parsePaginationQuery(req);
  const { searchParams } = new URL(req.url);

  const onlyDeleted =
    actor.role === "ADMIN" && searchParams.get("onlyDeleted") === "true";

  const result = await listReturns({
    pagination,
    memberId: searchParams.get("memberId") || undefined,
    status: searchParams.get("status") || undefined,
    returnType: searchParams.get("returnType") || undefined,
    paymentMethod: searchParams.get("paymentMethod") || undefined,
    onlyDeleted,
  });

  return sendResponse({
    statusCode: 200,
    message: "Returns fetched successfully",
    meta: result.meta,
    data: result.items,
  });
});

export const POST = withErrorHandler(async (req) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const body = createReturnSchema.parse(await req.json());
  const data = await createReturn(actor, body);

  return sendResponse({
    statusCode: 201,
    message:
      data.status === "APPROVED"
        ? "Return recorded and approved successfully"
        : "Return request submitted for approval",
    data,
  });
});
