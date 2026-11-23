import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import { reviewReturn } from "@/server/modules/returns/deposit-return.service";
import { reviewReturnSchema } from "@/server/modules/returns/deposit-return.validation";

export const PATCH = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER"]);
  const { id } = await context.params;
  const body = reviewReturnSchema.parse(await req.json());
  const data = await reviewReturn(actor, id, body);

  return sendResponse({
    statusCode: 200,
    message: `Return request ${body.status.toLowerCase()} successfully`,
    data,
  });
});
