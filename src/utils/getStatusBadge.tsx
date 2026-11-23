/**
 * Restrained, human-crafted semantic status badge styles.
 * Uses subtle light tints and hairline borders matching the JomaJatra forest/gold palette.
 */
export const getStatusBadge = (status: string) => {
  const normalized = status?.toUpperCase();

  switch (normalized) {
    case "APPROVED":
    case "ACTIVE":
    case "PAID":
    case "SETTLED":
    case "RESTORED":
      return "bg-emerald-50 text-emerald-800 border border-emerald-200/80";
    case "PENDING":
    case "PARTIAL":
    case "CASHIER":
    case "UNSETTLED":
      return "bg-amber-50 text-amber-800 border border-amber-200/80";
    case "REJECTED":
    case "INACTIVE":
    case "DELETED":
    case "DEACTIVATED":
    case "CANCELED":
    case "OVERDUE":
      return "bg-rose-50 text-rose-700 border border-rose-200/80";
    case "ADMIN":
    case "FULL_SETTLEMENT":
      return "bg-brand-5 text-brand-dark border border-brand-20";
    case "DONATED_WAIVER":
    case "UPDATED":
    case "ROLE_CHANGED":
      return "bg-muted text-foreground border border-border";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
};
