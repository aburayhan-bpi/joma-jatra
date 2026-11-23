import mongoose from "mongoose";
import { badRequest } from "../core/app-error";

/**
 * Normalizes transaction IDs (trim + uppercase) so duplicate checks work reliably.
 */
export function normalizeTrxId(trxId?: string | null): string | undefined {
  if (!trxId) return undefined;
  const cleaned = trxId.trim().toUpperCase();
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Formats a Date into YYYY-MM string (used for flexible monthly savings grouping).
 */
export function formatYearMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Rounds currency values cleanly to 2 decimal places to prevent floating-point drift.
 */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Validates and converts a string ID into a MongoDB ObjectId.
 */
export function toObjectId(id: string, label = "ID"): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw badRequest(`Invalid ${label} format`);
  }
  return new mongoose.Types.ObjectId(id);
}
