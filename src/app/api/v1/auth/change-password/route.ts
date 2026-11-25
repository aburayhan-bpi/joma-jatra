import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import { changeUserPassword } from "@/server/modules/auth/auth.service";
import { changePasswordSchema } from "@/server/modules/auth/auth.validation";

export const POST = withErrorHandler(async (req) => {
  const user = await requireAuth(req);
  const body = changePasswordSchema.parse(await req.json());
  const data = await changeUserPassword(user, body);

  const response = sendResponse({
    statusCode: 200,
    message: "Password changed successfully",
    data,
  });

  // Rotate auth cookies so the current browser session stays active after revoking other sessions
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
