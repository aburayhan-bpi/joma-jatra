import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import { changeMemberRole } from "@/server/modules/members/member.service";
import { changeMemberRoleSchema } from "@/server/modules/members/member.validation";

export const PATCH = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN"]);
  const { id } = await context.params;
  const body = changeMemberRoleSchema.parse(await req.json());
  const data = await changeMemberRole(actor, id, body.role);

  return sendResponse({
    statusCode: 200,
    message: `Member role updated to ${body.role} successfully`,
    data,
  });
});
