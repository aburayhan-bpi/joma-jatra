import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import { getMonthlyMatrix } from "@/server/modules/dashboard/dashboard.service";

export const GET = withErrorHandler(async (req) => {
  await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const { searchParams } = new URL(req.url);

  const rawYear = searchParams.get("year") || undefined;
  const year = rawYear && /^\d{4}$/.test(rawYear) ? rawYear : undefined;
  const includeInactive = searchParams.get("includeInactive") === "true";

  const data = await getMonthlyMatrix({ year, includeInactive });

  return sendResponse({
    statusCode: 200,
    message: "Monthly matrix fetched successfully",
    data,
  });
});
