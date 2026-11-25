import { sendResponse } from "@/server/core/api-response";
import { withErrorHandler } from "@/server/core/route-handler";
import { resetUserPassword } from "@/server/modules/auth/auth.service";
import { resetPasswordSchema } from "@/server/modules/auth/auth.validation";
import { enforceRateLimit } from "@/server/shared/rate-limit";

export const POST = withErrorHandler(async (req) => {
  enforceRateLimit(req, {
    namespace: "auth:reset-password",
    max: 10,
    windowMs: 15 * 60 * 1000,
  });

  const rawBody = await req.json();
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : undefined;

  const body = resetPasswordSchema.parse({
    resetToken: rawBody?.resetToken || bearerToken || "",
    newPassword: rawBody?.newPassword,
  });

  const data = await resetUserPassword(body.resetToken, body.newPassword);

  return sendResponse({
    statusCode: 200,
    message: "Password reset successfully",
    data,
  });
});
