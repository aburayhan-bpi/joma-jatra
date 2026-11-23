import { formatStatusText } from "@/utils/formatStatusText";
import { getStatusBadge } from "@/utils/getStatusBadge";

interface StatusPillProps {
  status: string;
  label?: string;
}

/**
 * Clean, understated status pill used across tables and detail headers.
 */
export default function StatusPill({ status, label }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-[3px] text-[11px] font-medium whitespace-nowrap ${getStatusBadge(status)}`}
    >
      {label || formatStatusText(status)}
    </span>
  );
}
