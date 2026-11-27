import BackButton from "@/components/shared/BackButton";
import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

/**
 * Standard, restrained header used at the top of every dashboard page.
 */
export default function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel = "Back to Overview",
  actions,
}: PageHeaderProps) {
  return (
    <div className="space-y-2 pb-5 border-b border-border">
      {backHref && <BackButton href={backHref} label={backLabel} />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}
