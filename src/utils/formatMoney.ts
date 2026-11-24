/**
 * Currency, Month & API Error Formatting Utilities
 */

export function formatTaka(amount?: number | null): string {
  const num = typeof amount === "number" && !Number.isNaN(amount) ? amount : 0;
  return `৳ ${num.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export function getCurrentYearMonth(): string {
  const bd = new Date(Date.now() + 6 * 60 * 60 * 1000);
  const y = bd.getUTCFullYear();
  const m = String(bd.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Formats any ISO date string (or current time when omitted) as YYYY-MM-DD
 * in Bangladesh Standard Time (Asia/Dhaka) for <input type="date" /> fields.
 */
export function toDateInputValue(iso?: string | Date | null): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return getTodayDateInputValue();
  const bd = new Date(d.getTime() + 6 * 60 * 60 * 1000);
  const y = bd.getUTCFullYear();
  const m = String(bd.getUTCMonth() + 1).padStart(2, "0");
  const day = String(bd.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Returns today's date as YYYY-MM-DD in Bangladesh Standard Time (Asia/Dhaka)
 * (avoids UTC off-by-one-day issues between 12:00 AM and 6:00 AM BDT).
 */
export function getTodayDateInputValue(): string {
  const bd = new Date(Date.now() + 6 * 60 * 60 * 1000);
  const y = bd.getUTCFullYear();
  const m = String(bd.getUTCMonth() + 1).padStart(2, "0");
  const d = String(bd.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatMonthLabel(yearMonth?: string | null): string {
  if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) return yearMonth || "—";
  const [year, month] = yearMonth.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function getPaymentMethodLabel(method?: string | null): string {
  switch (method) {
    case "CASH":
      return "Cash";
    case "BKASH":
      return "bKash";
    case "NAGAD":
      return "Nagad";
    case "ROCKET":
      return "Rocket";
    case "UPAY":
      return "Upay";
    case "CELLFIN":
      return "CellFin";
    case "BANK_TRANSFER":
      return "Bank Transfer";
    default:
      return method || "—";
  }
}

export function getApiErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (typeof err === "object" && err !== null) {
    const maybeErr = err as {
      data?: { message?: string };
      message?: string;
    };
    if (maybeErr.data?.message) return maybeErr.data.message;
    if (maybeErr.message) return maybeErr.message;
  }
  return fallback;
}
