import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import {
  getReturnById,
  softDeleteReturn,
  updateReturn,
} from "@/server/modules/returns/deposit-return.service";
import { updateReturnSchema } from "@/server/modules/returns/deposit-return.validation";

export const GET = withErrorHandler<{ id: string }>(async (req, context) => {
  await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const { id } = await context.params;
  const data = await getReturnById(id);

  return sendResponse({
    statusCode: 200,
    message: "Return record fetched successfully",
    data,
  });
});

export const PATCH = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const { id } = await context.params;
  const body = updateReturnSchema.parse(await req.json());
  const data = await updateReturn(actor, id, body);

  return sendResponse({
    statusCode: 200,
    message: "Return request updated successfully",
    data,
  });
});

export const DELETE = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const { id } = await context.params;
  const data = await softDeleteReturn(actor, id);

  return sendResponse({
    statusCode: 200,
    message: "Return record deleted successfully",
    data,
  });
});
