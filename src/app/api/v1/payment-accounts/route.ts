import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import {
  createPaymentAccount,
  listPaymentAccounts,
} from "@/server/modules/payment-accounts/payment-account.service";
import { createPaymentAccountSchema } from "@/server/modules/payment-accounts/payment-account.validation";
import { parsePaginationQuery } from "@/server/shared/pagination";

export const GET = withErrorHandler(async (req) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const pagination = parsePaginationQuery(req);
  const { searchParams } = new URL(req.url);

  const isActiveParam = searchParams.get("isActive");
  const result = await listPaymentAccounts({
    pagination,
    method: searchParams.get("method") || undefined,
    isActive:
      isActiveParam === "true"
        ? true
        : isActiveParam === "false"
          ? false
          : undefined,
    onlyDeleted:
      actor.role === "ADMIN" && searchParams.get("onlyDeleted") === "true",
  });

  return sendResponse({
    statusCode: 200,
    message: "Payment accounts fetched successfully",
    meta: result.meta,
    data: result.items,
  });
});

export const POST = withErrorHandler(async (req) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER"]);
  const body = createPaymentAccountSchema.parse(await req.json());
  const data = await createPaymentAccount(actor, body);

  return sendResponse({
    statusCode: 201,
    message: "Payment account created successfully",
    data,
  });
});
