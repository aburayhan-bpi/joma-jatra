import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import { restoreTransfer } from "@/server/modules/transfers/account-transfer.service";

export const PATCH = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN"]);
  const { id } = await context.params;
  const data = await restoreTransfer(actor, id);

  return sendResponse({
    statusCode: 200,
    message: "Transfer restored successfully",
    data,
  });
});
