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
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
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
