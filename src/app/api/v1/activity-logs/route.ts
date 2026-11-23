import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import { listActivityLogs } from "@/server/modules/activity-logs/activity-log.service";
import { parsePaginationQuery } from "@/server/shared/pagination";

export const GET = withErrorHandler(async (req) => {
  await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const pagination = parsePaginationQuery(req);
  const { searchParams } = new URL(req.url);

  const result = await listActivityLogs({
    pagination,
    entityType: searchParams.get("entityType") || undefined,
    action: searchParams.get("action") || undefined,
    targetMemberId: searchParams.get("targetMemberId") || undefined,
  });

  return sendResponse({
    statusCode: 200,
    message: "Activity logs fetched successfully",
    meta: result.meta,
    data: result.items,
  });
});
