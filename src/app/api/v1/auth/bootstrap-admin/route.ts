import { sendResponse } from "@/server/core/api-response";
import { withErrorHandler } from "@/server/core/route-handler";
import { bootstrapAdmin } from "@/server/modules/auth/auth.service";
import { bootstrapAdminSchema } from "@/server/modules/auth/auth.validation";
import { enforceRateLimit } from "@/server/shared/rate-limit";

export const POST = withErrorHandler(async (req) => {
  enforceRateLimit(req, {
    namespace: "auth:bootstrap",
    max: 5,
    windowMs: 15 * 60 * 1000,
  });

  const body = bootstrapAdminSchema.parse(await req.json());
  const data = await bootstrapAdmin(body);

  const response = sendResponse({
    statusCode: 201,
    message: "Initial Admin account created successfully",
    data,
  });

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
