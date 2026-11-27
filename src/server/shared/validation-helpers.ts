import { z } from "zod";
import { roundMoney } from "./normalize";

/**
 * Validates optional image URLs (proof screenshots, avatars).
 * Allows empty string, safe https/http URLs, or app-relative paths ("/..."),
 * while rejecting unsafe schemes such as javascript: or data:.
 */
export const safeImageUrlSchema = z
  .string()
  .trim()
  .max(1000, "Image URL is too long")
  .refine(
    (val) => {
      if (!val) return true;
      if (val.startsWith("/")) return !val.startsWith("//");
      try {
        const parsed = new URL(val);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
      } catch {
        return false;
      }
    },
    { message: "Image URL must be a valid http(s) URL or relative path" },
  );

/**
 * Validates monetary amounts consistently with Mongoose `min: 1` and rounds to 2 decimals.
 */
export function moneyAmountSchema(label: string, max = 100000000) {
  return z
    .number()
    .min(1, `${label} must be at least ৳1`)
    .max(max, `${label} exceeds the maximum allowed amount`)
    .transform((val) => roundMoney(val));
}

/**
 * Validates optional non-negative fee amounts (>= 0) and rounds to 2 decimals.
 */
export function feeAmountSchema(label = "Fee", max = 10000000) {
  return z
    .number()
    .min(0, `${label} cannot be negative`)
    .max(max, `${label} exceeds the maximum allowed amount`)
    .transform((val) => roundMoney(val));
}
