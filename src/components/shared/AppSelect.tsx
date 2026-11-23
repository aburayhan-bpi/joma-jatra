"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface AppSelectOption {
  value: string;
  label: string;
}

interface AppSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default";
}

// Radix Select forbids empty string values, so we map "" internally to a safe sentinel.
const EMPTY_SENTINEL = "__ALL__";

/**
 * Reusable Radix Select wrapper used across all filter bars and form modals
 * so there are zero raw native browser <select> elements anywhere in the app.
 */
export default function AppSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  className,
  size = "default",
}: AppSelectProps) {
  const safeValue = value === "" ? EMPTY_SENTINEL : value;

  return (
    <Select
      value={safeValue}
      onValueChange={(next) => onChange(next === EMPTY_SENTINEL ? "" : next)}
      disabled={disabled}
    >
      <SelectTrigger
        size={size}
        className={cn("w-full bg-card text-foreground", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper">
        {options.map((opt) => (
          <SelectItem
            key={opt.value || EMPTY_SENTINEL}
            value={opt.value === "" ? EMPTY_SENTINEL : opt.value}
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
