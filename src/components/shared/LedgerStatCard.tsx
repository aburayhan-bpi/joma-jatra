import { cn } from "@/lib/utils";
import React from "react";

export type StatTone =
  | "emerald"
  | "steel"
  | "teal"
  | "indigo"
  | "slate"
  | "amber";

const toneStyles: Record<StatTone, string> = {
  // Calm, eye-cold financial tones — subtle tint + crisp border, zero neon
  emerald: "bg-[#e9f4ef] text-[#046c4e] border-[#cce3d8]",
  steel: "bg-[#edf3f8] text-[#285a84] border-[#d2e0ed]",
  teal: "bg-[#e9f4f5] text-[#1c6b72] border-[#cae1e3]",
  indigo: "bg-[#eef1f8] text-[#3b5284] border-[#d4dced]",
  slate: "bg-[#f1f4f6] text-[#495e6b] border-[#d9e2e7]",
  amber: "bg-[#fcf4e6] text-[#a15c07] border-[#edd9b4]",
};

interface LedgerStatCardProps {
  label: string;
  value: string;
  subtext?: React.ReactNode;
  badge?: React.ReactNode;
  icon: React.ReactNode;
  tone?: StatTone;
  valueClassName?: string;
  footer?: React.ReactNode;
}

/**
 * Crisp, flat financial KPI card with a calm eye-cold icon box.
 */
export default function LedgerStatCard({
  label,
  value,
  subtext,
  badge,
  icon,
  tone = "slate",
  valueClassName,
  footer,
}: LedgerStatCardProps) {
  return (
    <div className="bg-card border border-border rounded-md p-4 flex flex-col justify-between gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground truncate">
              {label}
            </p>
            {badge}
          </div>
          <p
            className={cn(
              "text-xl sm:text-2xl font-semibold text-foreground font-money tracking-tight mt-1.5",
              valueClassName,
            )}
          >
            {value}
          </p>
        </div>

        <div
          className={cn(
            "w-9 h-9 rounded-md border flex items-center justify-center shrink-0",
            toneStyles[tone],
          )}
        >
          {icon}
        </div>
      </div>

      {footer}

      {subtext && (
        <div className="text-[11px] text-muted-foreground leading-snug">
          {subtext}
        </div>
      )}
    </div>
  );
}
