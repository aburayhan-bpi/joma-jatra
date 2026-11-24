const APP_TIMEZONE = "Asia/Dhaka";

export const formatDate = (
  iso?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  p0?: { formatStr: string; fallback: string },
) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
};

export const formatDateTime = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: APP_TIMEZONE,
  });
};
