import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import { restorePaymentAccount } from "@/server/modules/payment-accounts/payment-account.service";

export const PATCH = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN"]);
  const { id } = await context.params;
  const data = await restorePaymentAccount(actor, id);

  return sendResponse({
    statusCode: 200,
    message: "Payment account restored successfully",
    data,
  });
});
