import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import { changeUserPassword } from "@/server/modules/auth/auth.service";
import { changePasswordSchema } from "@/server/modules/auth/auth.validation";

export const POST = withErrorHandler(async (req) => {
  const user = await requireAuth(req);
  const body = changePasswordSchema.parse(await req.json());
  const data = await changeUserPassword(user, body);

  return sendResponse({
    statusCode: 200,
    message: "Password changed successfully",
    data,
  });
});
