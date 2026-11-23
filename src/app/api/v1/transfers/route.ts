import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import {
  createTransfer,
  listTransfers,
} from "@/server/modules/transfers/account-transfer.service";
import { createTransferSchema } from "@/server/modules/transfers/account-transfer.validation";
import { parsePaginationQuery } from "@/server/shared/pagination";

export const GET = withErrorHandler(async (req) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const pagination = parsePaginationQuery(req);
  const { searchParams } = new URL(req.url);

  const onlyDeleted =
    actor.role === "ADMIN" && searchParams.get("onlyDeleted") === "true";

  const result = await listTransfers({
    pagination,
    accountId: searchParams.get("accountId") || undefined,
    onlyDeleted,
  });

  return sendResponse({
    statusCode: 200,
    message: "Transfers fetched successfully",
    meta: result.meta,
    data: result.items,
  });
});

export const POST = withErrorHandler(async (req) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER"]);
  const body = createTransferSchema.parse(await req.json());
  const data = await createTransfer(actor, body);

  return sendResponse({
    statusCode: 201,
    message: "Internal account transfer recorded successfully",
    data,
  });
});
