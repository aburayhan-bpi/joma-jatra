import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import {
  createCharge,
  listCharges,
} from "@/server/modules/charges/account-charge.service";
import { createChargeSchema } from "@/server/modules/charges/account-charge.validation";
import { parsePaginationQuery } from "@/server/shared/pagination";

export const GET = withErrorHandler(async (req) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const pagination = parsePaginationQuery(req);
  const { searchParams } = new URL(req.url);

  const onlyDeleted =
    actor.role === "ADMIN" && searchParams.get("onlyDeleted") === "true";

  const result = await listCharges({
    pagination,
    paymentAccountId: searchParams.get("paymentAccountId") || undefined,
    onlyDeleted,
  });

  return sendResponse({
    statusCode: 200,
    message: "Account charges fetched successfully",
    meta: result.meta,
    data: result.items,
  });
});

export const POST = withErrorHandler(async (req) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER"]);
  const body = createChargeSchema.parse(await req.json());
  const data = await createCharge(actor, body);

  return sendResponse({
    statusCode: 201,
    message: "Account charge recorded successfully",
    data,
  });
});
