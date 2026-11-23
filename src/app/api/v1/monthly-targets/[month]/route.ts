import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import { getMonthlyTargetByMonth } from "@/server/modules/monthly-targets/monthly-target.service";
import { monthStringSchema } from "@/server/modules/monthly-targets/monthly-target.validation";

export const GET = withErrorHandler<{ month: string }>(async (req, context) => {
  await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const { month } = await context.params;
  const validMonth = monthStringSchema.parse(month);
  const data = await getMonthlyTargetByMonth(validMonth);

  return sendResponse({
    statusCode: 200,
    message: "Monthly target fetched successfully",
    data,
  });
});
