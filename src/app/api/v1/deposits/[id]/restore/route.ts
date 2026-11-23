import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import { restoreDeposit } from "@/server/modules/deposits/deposit.service";

export const PATCH = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN"]);
  const { id } = await context.params;
  const data = await restoreDeposit(actor, id);

  return sendResponse({
    statusCode: 200,
    message: "Deposit restored successfully",
    data,
  });
});
