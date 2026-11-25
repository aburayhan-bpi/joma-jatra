import { sendResponse } from "@/server/core/api-response";
import { withErrorHandler } from "@/server/core/route-handler";
import { verifyForgotPasswordOtp } from "@/server/modules/auth/auth.service";
import { verifyForgotOtpSchema } from "@/server/modules/auth/auth.validation";
import { enforceRateLimit } from "@/server/shared/rate-limit";

export const POST = withErrorHandler(async (req) => {
  enforceRateLimit(req, {
    namespace: "auth:verify-otp",
    max: 10,
    windowMs: 15 * 60 * 1000,
    message:
      "Too many OTP verification attempts. Please wait a few minutes and try again.",
  });

  const body = verifyForgotOtpSchema.parse(await req.json());
  const data = await verifyForgotPasswordOtp(body.email, body.otp);

  return sendResponse({
    statusCode: 200,
    message: "OTP verified successfully",
    data,
  });
});
