import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import {
  getChargeById,
  softDeleteCharge,
} from "@/server/modules/charges/account-charge.service";

export const GET = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const { id } = await context.params;
  const data = await getChargeById(id, {
    includeDeleted: actor.role === "ADMIN",
  });

  return sendResponse({
    statusCode: 200,
    message: "Charge record fetched successfully",
    data,
  });
});

export const DELETE = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN"]);
  const { id } = await context.params;
  const data = await softDeleteCharge(actor, id);

  return sendResponse({
    statusCode: 200,
    message: "Charge moved to trash successfully",
    data,
  });
});
