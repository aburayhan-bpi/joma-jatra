import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import { restoreCharge } from "@/server/modules/charges/account-charge.service";

export const PATCH = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN"]);
  const { id } = await context.params;
  const data = await restoreCharge(actor, id);

  return sendResponse({
    statusCode: 200,
    message: "Charge restored successfully",
    data,
  });
});
