import { sendResponse } from "@/server/core/api-response";
import { badRequest } from "@/server/core/app-error";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import { uploadProofImage } from "@/server/shared/cloudinary";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const ALLOWED_FOLDERS = new Set([
  "joma-jatra/proofs",
  "joma-jatra/avatars",
  "joma-jatra/returns",
  "joma-jatra/transfers",
  "joma-jatra/charges",
]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const POST = withErrorHandler(async (req) => {
  await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);

  const formData = await req.formData();
  const file = formData.get("file");
  const rawFolder = String(formData.get("folder") || "joma-jatra/proofs").trim();
  const folder = ALLOWED_FOLDERS.has(rawFolder)
    ? rawFolder
    : "joma-jatra/proofs";

  if (!(file instanceof File)) {
    throw badRequest("Please attach an image file under the 'file' field");
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw badRequest("Only JPG, PNG, and WEBP image files are allowed");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw badRequest("Image file size must not exceed 5 MB");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const uploaded = await uploadProofImage(buffer, folder);

  return sendResponse({
    statusCode: 201,
    message: "Proof image uploaded successfully",
    data: uploaded,
  });
});
