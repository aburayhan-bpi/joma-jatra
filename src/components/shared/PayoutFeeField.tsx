"use client";

import { formatTaka } from "@/utils/formatMoney";

interface PayoutFeeFieldProps {
  grossAmount: number;
  feeValue: string;
  onChange: (value: string) => void;
  label?: string;
}

/**
 * Reusable optional payout fee input with a live net-disbursement preview.
 * Ensures the fee is deducted from the member's return without touching other members' funds.
 */
export default function PayoutFeeField({
  grossAmount,
  feeValue,
  onChange,
  label = "Send Money / Cash-Out Fee (BDT, Optional)",
}: PayoutFeeFieldProps) {
  const numericFee = Number(feeValue || 0);
  const hasValidGross = !Number.isNaN(grossAmount) && grossAmount >= 1;
  const hasFee = !Number.isNaN(numericFee) && numericFee > 0;
  const invalidFee =
    Number.isNaN(numericFee) ||
    numericFee < 0 ||
    (hasValidGross && numericFee >= grossAmount);
  const netToSend = hasValidGross
    ? Math.max(0, Math.round((grossAmount - Math.max(0, numericFee)) * 100) / 100)
    : 0;

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-text-description">
        {label}
      </label>
      <input
        type="number"
        min={0}
        step="any"
        placeholder="0"
        value={feeValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 rounded border border-input bg-card text-sm font-money text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
      />
      {hasValidGross && (hasFee || invalidFee) && (
        <div
          className={`rounded px-3 py-1.5 text-[11px] flex flex-wrap items-center justify-between gap-2 border ${
            invalidFee
              ? "bg-error-5 border-error/25 text-error"
              : "bg-muted/60 border-border text-muted-foreground"
          }`}
        >
          {invalidFee ? (
            <span>
              Fee must be between ৳0 and less than {formatTaka(grossAmount)}.
            </span>
          ) : (
            <>
              <span>
                Settled{" "}
                <strong className="text-foreground font-money">
                  {formatTaka(grossAmount)}
                </strong>{" "}
                − Fee{" "}
                <strong className="text-gold-dark font-money">
                  {formatTaka(numericFee)}
                </strong>
              </span>
              <span>
                Send to Member:{" "}
                <strong className="text-primary font-money">
                  {formatTaka(netToSend)}
                </strong>
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
