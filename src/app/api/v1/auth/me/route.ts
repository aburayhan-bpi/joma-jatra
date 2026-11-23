import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import {
  getAuthenticatedProfile,
  updateAuthenticatedProfile,
} from "@/server/modules/auth/auth.service";
import { updateSelfProfileSchema } from "@/server/modules/auth/auth.validation";

export const GET = withErrorHandler(async (req) => {
  const user = await requireAuth(req);
  const data = await getAuthenticatedProfile(user);

  return sendResponse({
    statusCode: 200,
    message: "Profile fetched successfully",
    data,
  });
});

export const PATCH = withErrorHandler(async (req) => {
  const user = await requireAuth(req);
  const body = updateSelfProfileSchema.parse(await req.json());
  const data = await updateAuthenticatedProfile(user, body);

  return sendResponse({
    statusCode: 200,
    message: "Profile updated successfully",
    data,
  });
});
