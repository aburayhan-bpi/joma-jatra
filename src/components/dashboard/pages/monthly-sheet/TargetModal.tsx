"use client";

import CancelSubmitButton from "@/components/shared/CancelSubmitButton";
import CustomModal from "@/components/shared/CustomModal";
import { useUpsertMonthlyTargetMutation } from "@/redux/api/targets/targetsApi";
import {
  formatMonthLabel,
  getApiErrorMessage,
  getCurrentYearMonth,
} from "@/utils/formatMoney";
import { useState } from "react";
import { toast } from "sonner";

interface TargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMonth?: string;
  initialAmount?: number;
  initialNote?: string;
}

/**
 * Inner form mounts fresh each time the modal opens, avoiding useEffect resets.
 */
function TargetForm({
  onClose,
  initialMonth,
  initialAmount,
  initialNote,
}: Omit<TargetModalProps, "isOpen">) {
  const [month, setMonth] = useState(initialMonth || getCurrentYearMonth());
  const [targetAmount, setTargetAmount] = useState(
    initialAmount !== undefined && initialAmount > 0
      ? String(initialAmount)
      : "",
  );
  const [note, setNote] = useState(initialNote || "");

  const [upsertTarget, { isLoading }] = useUpsertMonthlyTargetMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(targetAmount);

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      toast.error("Please select a valid month");
      return;
    }
    if (Number.isNaN(numericAmount) || numericAmount < 0) {
      toast.error("Target amount must be 0 or greater");
      return;
    }

    try {
      await upsertTarget({
        month,
        targetAmount: numericAmount,
        note: note.trim() || undefined,
      }).unwrap();
      toast.success(`Saved target for ${formatMonthLabel(month)}`);
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save monthly target"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-description">
          Month
        </label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          required
          className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-description">
          Group Target Amount (BDT)
        </label>
        <input
          type="number"
          min={0}
          step="any"
          placeholder="e.g. 50000"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          required
          className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground font-money focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-description">
          Note (Optional)
        </label>
        <textarea
          rows={2}
          placeholder="Optional context for this month's target..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full p-2.5 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
        />
      </div>

      <CancelSubmitButton
        handleCancel={onClose}
        loading={isLoading}
        submitText="Save Target"
      />
    </form>
  );
}

/**
 * Modal for Admin / Cashier to set or update the group's monthly savings target.
 */
export default function TargetModal(props: TargetModalProps) {
  const { isOpen, onClose, initialMonth, initialAmount, initialNote } = props;

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Monthly Group Target"
      subtitle="Flexible collective target for the selected month"
      className="max-w-md"
    >
      {isOpen && (
        <TargetForm
          key={`${initialMonth || "current"}-${initialAmount ?? ""}`}
          onClose={onClose}
          initialMonth={initialMonth}
          initialAmount={initialAmount}
          initialNote={initialNote}
        />
      )}
    </CustomModal>
  );
}
