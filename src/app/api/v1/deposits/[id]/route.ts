import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import {
  getDepositById,
  softDeleteDeposit,
  updateDeposit,
} from "@/server/modules/deposits/deposit.service";
import { updateDepositSchema } from "@/server/modules/deposits/deposit.validation";

export const GET = withErrorHandler<{ id: string }>(async (req, context) => {
  await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const { id } = await context.params;
  const data = await getDepositById(id);

  return sendResponse({
    statusCode: 200,
    message: "Deposit fetched successfully",
    data,
  });
});

export const PATCH = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const { id } = await context.params;
  const body = updateDepositSchema.parse(await req.json());
  const data = await updateDeposit(actor, id, body);

  return sendResponse({
    statusCode: 200,
    message: "Deposit updated successfully",
    data,
  });
});

export const DELETE = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const { id } = await context.params;
  const data = await softDeleteDeposit(actor, id);

  return sendResponse({
    statusCode: 200,
    message: "Deposit deleted successfully",
    data,
  });
});
