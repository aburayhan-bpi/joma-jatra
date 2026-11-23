import { sendResponse } from "@/server/core/api-response";
import { withErrorHandler } from "@/server/core/route-handler";
import { verifyForgotPasswordOtp } from "@/server/modules/auth/auth.service";
import { verifyForgotOtpSchema } from "@/server/modules/auth/auth.validation";

export const POST = withErrorHandler(async (req) => {
  const body = verifyForgotOtpSchema.parse(await req.json());
  const data = await verifyForgotPasswordOtp(body.email, body.otp);

  return sendResponse({
    statusCode: 200,
    message: "OTP verified successfully",
    data,
  });
});
