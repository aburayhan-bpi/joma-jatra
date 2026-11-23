import { sendResponse } from "@/server/core/api-response";
import { unauthorized } from "@/server/core/app-error";
import { withErrorHandler } from "@/server/core/route-handler";
import { refreshAuthTokens } from "@/server/modules/auth/auth.service";
import { refreshTokenSchema } from "@/server/modules/auth/auth.validation";

export const POST = withErrorHandler(async (req) => {
  const rawBody = await req.json().catch(() => ({}));
  const cookieRefresh = req.cookies.get("refreshToken")?.value;
  const parsed = refreshTokenSchema.safeParse({
    refreshToken: rawBody?.refreshToken || cookieRefresh || "",
  });

  if (!parsed.success) {
    throw unauthorized("Refresh token is missing");
  }

  const data = await refreshAuthTokens(parsed.data.refreshToken);
  const response = sendResponse({
    statusCode: 200,
    message: "Session refreshed successfully",
    data,
  });

  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set("accessToken", data.accessToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  response.cookies.set("refreshToken", data.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
});
