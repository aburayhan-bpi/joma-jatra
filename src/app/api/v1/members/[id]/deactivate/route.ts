import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import { deactivateMember } from "@/server/modules/members/member.service";
import { deactivateMemberSchema } from "@/server/modules/members/member.validation";

export const POST = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN"]);
  const { id } = await context.params;
  const body = deactivateMemberSchema.parse(await req.json());
  const data = await deactivateMember(actor, id, body);

  return sendResponse({
    statusCode: 200,
    message: "Member account deactivated successfully",
    data,
  });
});
