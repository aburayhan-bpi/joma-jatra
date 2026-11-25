import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import {
  getPaymentAccountById,
  softDeletePaymentAccount,
  updatePaymentAccount,
} from "@/server/modules/payment-accounts/payment-account.service";
import { updatePaymentAccountSchema } from "@/server/modules/payment-accounts/payment-account.validation";

export const GET = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const { id } = await context.params;
  const data = await getPaymentAccountById(id, {
    includeDeleted: actor.role === "ADMIN",
  });

  return sendResponse({
    statusCode: 200,
    message: "Payment account fetched successfully",
    data,
  });
});

export const PATCH = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER"]);
  const { id } = await context.params;
  const body = updatePaymentAccountSchema.parse(await req.json());
  const data = await updatePaymentAccount(actor, id, body);

  return sendResponse({
    statusCode: 200,
    message: "Payment account updated successfully",
    data,
  });
});

export const DELETE = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN"]);
  const { id } = await context.params;
  const data = await softDeletePaymentAccount(actor, id);

  return sendResponse({
    statusCode: 200,
    message: "Payment account moved to trash successfully",
    data,
  });
});
