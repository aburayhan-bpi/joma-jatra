import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import { getDashboardSummary } from "@/server/modules/dashboard/dashboard.service";
import { monthStringSchema } from "@/server/modules/monthly-targets/monthly-target.validation";

export const GET = withErrorHandler(async (req) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const { searchParams } = new URL(req.url);
  const rawMonth = searchParams.get("month");
  const month = rawMonth ? monthStringSchema.parse(rawMonth) : undefined;

  const data = await getDashboardSummary(actor, month);

  return sendResponse({
    statusCode: 200,
    message: "Dashboard summary fetched successfully",
    data,
  });
});
