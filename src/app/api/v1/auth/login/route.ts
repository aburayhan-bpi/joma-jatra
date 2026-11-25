import { sendResponse } from "@/server/core/api-response";
import { withErrorHandler } from "@/server/core/route-handler";
import { loginUser } from "@/server/modules/auth/auth.service";
import { loginSchema } from "@/server/modules/auth/auth.validation";
import { enforceRateLimit } from "@/server/shared/rate-limit";

export const POST = withErrorHandler(async (req) => {
  enforceRateLimit(req, {
    namespace: "auth:login",
    max: 15,
    windowMs: 15 * 60 * 1000,
    message: "Too many login attempts. Please wait a few minutes and try again.",
  });

  const body = loginSchema.parse(await req.json());
  const data = await loginUser(body);

  const response = sendResponse({
    statusCode: 200,
    message: "Logged in successfully",
    data,
  });

  // Set cookies so Next.js middleware & browser SSR requests recognize auth state
  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set("accessToken", data.accessToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
  });
  response.cookies.set("refreshToken", data.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
});
