import { v2 as cloudinary } from "cloudinary";
import { AppError } from "../core/app-error";
import { serverEnv } from "../core/env";

let isConfigured = false;

function ensureCloudinaryConfigured() {
  if (isConfigured) return;

  if (
    !serverEnv.cloudinaryCloudName ||
    !serverEnv.cloudinaryApiKey ||
    !serverEnv.cloudinaryApiSecret
  ) {
    throw new AppError(
      503,
      "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local.",
    );
  }

  cloudinary.config({
    cloud_name: serverEnv.cloudinaryCloudName,
    api_key: serverEnv.cloudinaryApiKey,
    api_secret: serverEnv.cloudinaryApiSecret,
    secure: true,
  });

  isConfigured = true;
}

export interface UploadedProofResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

/**
 * Uploads a proof image buffer (deposit/return/transfer/charge slip) to Cloudinary.
 */
export async function uploadProofImage(
  buffer: Buffer,
  folder = "joma-jatra/proofs",
): Promise<UploadedProofResult> {
  ensureCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        if (error || !result) {
          reject(
            new AppError(
              500,
              error?.message || "Failed to upload proof image to Cloudinary",
            ),
          );
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      },
    );

    stream.end(buffer);
  });
}

/**
 * Deletes an uploaded image from Cloudinary by publicId (best-effort).
 */
export async function deleteProofImage(publicId: string): Promise<void> {
  if (!publicId) return;
  ensureCloudinaryConfigured();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
