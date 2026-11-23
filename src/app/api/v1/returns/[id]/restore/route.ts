import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import { restoreReturn } from "@/server/modules/returns/deposit-return.service";

export const PATCH = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN"]);
  const { id } = await context.params;
  const data = await restoreReturn(actor, id);

  return sendResponse({
    statusCode: 200,
    message: "Return record restored successfully",
    data,
  });
});
