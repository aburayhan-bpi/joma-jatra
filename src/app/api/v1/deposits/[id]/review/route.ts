import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import { reviewDeposit } from "@/server/modules/deposits/deposit.service";
import { reviewDepositSchema } from "@/server/modules/deposits/deposit.validation";

export const PATCH = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER"]);
  const { id } = await context.params;
  const body = reviewDepositSchema.parse(await req.json());
  const data = await reviewDeposit(actor, id, body);

  return sendResponse({
    statusCode: 200,
    message: `Deposit ${body.status.toLowerCase()} successfully`,
    data,
  });
});
