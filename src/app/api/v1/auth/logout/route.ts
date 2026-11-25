import { sendResponse } from "@/server/core/api-response";
import {
  extractAccessToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import { revokeUserSessions } from "@/server/modules/auth/auth.service";

export const POST = withErrorHandler(async (req) => {
  // Best-effort server-side session revocation via access or refresh token
  let userId: string | null = null;
  const accessToken = extractAccessToken(req);
  if (accessToken) {
    try {
      userId = verifyAccessToken(accessToken).userId;
    } catch {
      // Fall through to refresh cookie check
    }
  }
  if (!userId) {
    const refreshCookie = req.cookies.get("refreshToken")?.value;
    if (refreshCookie) {
      try {
        userId = verifyRefreshToken(refreshCookie).userId;
      } catch {
        // Ignore expired/invalid tokens on logout
      }
    }
  }

  if (userId) {
    await revokeUserSessions(userId);
  }

  const response = sendResponse({
    statusCode: 200,
    message: "Logged out successfully",
    data: null,
  });

  response.cookies.delete("accessToken");
  response.cookies.delete("refreshToken");
  response.cookies.delete("auth_token");

  return response;
});
