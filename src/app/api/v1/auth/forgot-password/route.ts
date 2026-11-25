import { sendResponse } from "@/server/core/api-response";
import { withErrorHandler } from "@/server/core/route-handler";
import { requestForgotPasswordOtp } from "@/server/modules/auth/auth.service";
import { forgotPasswordSchema } from "@/server/modules/auth/auth.validation";
import { enforceRateLimit } from "@/server/shared/rate-limit";

export const POST = withErrorHandler(async (req) => {
  enforceRateLimit(req, {
    namespace: "auth:forgot-password",
    max: 5,
    windowMs: 15 * 60 * 1000,
    message:
      "Too many password reset requests. Please wait a few minutes and try again.",
  });

  const body = forgotPasswordSchema.parse(await req.json());
  const data = await requestForgotPasswordOtp(body.email);

  return sendResponse({
    statusCode: 200,
    message:
      "If an active account exists for this email, a verification code has been sent.",
    data,
  });
});
