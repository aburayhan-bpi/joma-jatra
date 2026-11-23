import { sendResponse } from "@/server/core/api-response";
import { withErrorHandler } from "@/server/core/route-handler";
import { bootstrapAdmin } from "@/server/modules/auth/auth.service";
import { bootstrapAdminSchema } from "@/server/modules/auth/auth.validation";

export const POST = withErrorHandler(async (req) => {
  const body = bootstrapAdminSchema.parse(await req.json());
  const data = await bootstrapAdmin(body);

  return sendResponse({
    statusCode: 201,
    message: "Initial Admin account created successfully",
    data,
  });
});
