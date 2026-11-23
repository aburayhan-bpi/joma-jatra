import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import {
  getTransferById,
  softDeleteTransfer,
} from "@/server/modules/transfers/account-transfer.service";

export const GET = withErrorHandler<{ id: string }>(async (req, context) => {
  await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const { id } = await context.params;
  const data = await getTransferById(id);

  return sendResponse({
    statusCode: 200,
    message: "Transfer record fetched successfully",
    data,
  });
});

export const DELETE = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN"]);
  const { id } = await context.params;
  const data = await softDeleteTransfer(actor, id);

  return sendResponse({
    statusCode: 200,
    message: "Transfer moved to trash successfully",
    data,
  });
});
