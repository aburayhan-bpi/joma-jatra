import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import { getMemberAuditTrail } from "@/server/modules/members/member.service";
import { parsePaginationQuery } from "@/server/shared/pagination";

export const GET = withErrorHandler<{ id: string }>(async (req, context) => {
  await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const { id } = await context.params;
  const pagination = parsePaginationQuery(req, 25, 1000);
  const { searchParams } = new URL(req.url);

  const result = await getMemberAuditTrail(id, {
    pagination,
    category: searchParams.get("category") || undefined,
    status: searchParams.get("status") || undefined,
    month: searchParams.get("month") || undefined,
  });

  return sendResponse({
    statusCode: 200,
    message: "Member audit trail fetched successfully",
    meta: result.meta,
    data: result.items,
  });
});
