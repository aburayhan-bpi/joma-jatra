import { sendResponse } from "@/server/core/api-response";
import { withErrorHandler } from "@/server/core/route-handler";

export const POST = withErrorHandler(async () => {
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
