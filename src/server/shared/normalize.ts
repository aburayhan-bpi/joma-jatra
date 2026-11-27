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

const BD_OFFSET_MS = 6 * 60 * 60 * 1000; // Asia/Dhaka (UTC+6, no DST)

/**
 * Formats a Date into YYYY-MM string in Bangladesh Standard Time (Asia/Dhaka, UTC+6)
 * so deposits made between 12:00 AM and 6:00 AM BDT are always grouped into the exact BDT month,
 * even when the server runs in UTC (e.g. Vercel).
 */
export function formatYearMonth(date: Date): string {
  const bd = new Date(date.getTime() + BD_OFFSET_MS);
  const year = bd.getUTCFullYear();
  const month = String(bd.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Rounds currency values cleanly to 2 decimal places to prevent floating-point drift.
 */
export function roundMoney(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) || rounded === 0 ? 0 : rounded;
}

/**
 * Resolves a transaction date coming from date-only pickers ("YYYY-MM-DD" -> UTC midnight).
 * - If no date is supplied, returns exact current timestamp.
 * - If supplied date matches today's calendar date in Asia/Dhaka (UTC+6), returns exact current timestamp
 *   so entries never show 6:00 AM or sort behind earlier same-day events.
 * - If backdated to another calendar day, pins to 06:00 UTC (12:00 PM BDT midday) so the calendar date
 *   never shifts backward/forward across UTC or Asia/Dhaka boundaries.
 */
export function resolveTransactionDate(inputDate?: Date): Date {
  const now = new Date();
  if (!inputDate || Number.isNaN(inputDate.getTime())) {
    return now;
  }

  const isUtcMidnight =
    inputDate.getUTCHours() === 0 &&
    inputDate.getUTCMinutes() === 0 &&
    inputDate.getUTCSeconds() === 0 &&
    inputDate.getUTCMilliseconds() === 0;

  if (!isUtcMidnight) {
    return inputDate;
  }

  const y = inputDate.getUTCFullYear();
  const m = inputDate.getUTCMonth();
  const d = inputDate.getUTCDate();

  const bdNow = new Date(now.getTime() + BD_OFFSET_MS);
  const isTodayBd =
    y === bdNow.getUTCFullYear() &&
    m === bdNow.getUTCMonth() &&
    d === bdNow.getUTCDate();

  if (isTodayBd) {
    return now;
  }

  // Midday Bangladesh Time (12:00 PM BDT = 06:00 UTC) prevents any timezone day-shift
  return new Date(Date.UTC(y, m, d, 6, 0, 0, 0));
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
