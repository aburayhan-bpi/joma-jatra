import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import {
  getMemberDetails,
  updateMember,
} from "@/server/modules/members/member.service";
import { updateMemberSchema } from "@/server/modules/members/member.validation";

export const GET = withErrorHandler<{ id: string }>(async (req, context) => {
  await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const { id } = await context.params;
  const data = await getMemberDetails(id);

  return sendResponse({
    statusCode: 200,
    message: "Member details fetched successfully",
    data,
  });
});

export const PATCH = withErrorHandler<{ id: string }>(async (req, context) => {
  const actor = await requireAuth(req, ["ADMIN"]);
  const { id } = await context.params;
  const body = updateMemberSchema.parse(await req.json());
  const data = await updateMember(actor, id, body);

  return sendResponse({
    statusCode: 200,
    message: "Member updated successfully",
    data,
  });
});
