import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import {
  listMonthlyTargets,
  upsertMonthlyTarget,
} from "@/server/modules/monthly-targets/monthly-target.service";
import { upsertMonthlyTargetSchema } from "@/server/modules/monthly-targets/monthly-target.validation";
import { parsePaginationQuery } from "@/server/shared/pagination";

export const GET = withErrorHandler(async (req) => {
  await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const pagination = parsePaginationQuery(req);
  const result = await listMonthlyTargets(pagination);

  return sendResponse({
    statusCode: 200,
    message: "Monthly targets fetched successfully",
    meta: result.meta,
    data: result.items,
  });
});

export const PUT = withErrorHandler(async (req) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER"]);
  const body = upsertMonthlyTargetSchema.parse(await req.json());
  const data = await upsertMonthlyTarget(actor, body);

  return sendResponse({
    statusCode: 200,
    message: `Monthly target for ${body.month} saved successfully`,
    data,
  });
});
