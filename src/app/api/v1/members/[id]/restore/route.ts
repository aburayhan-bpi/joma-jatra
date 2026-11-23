import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import { restoreMember } from "@/server/modules/members/member.service";

export const PATCH = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN"]);
  const { id } = await context.params;
  const data = await restoreMember(actor, id);

  return sendResponse({
    statusCode: 200,
    message: "Member restored and reactivated successfully",
    data,
  });
});
