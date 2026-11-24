"use client";

import CustomButton from "@/components/shared/CustomButton";
import CustomModal from "@/components/shared/CustomModal";
import { Checkbox } from "@/components/ui/checkbox";
import { useResetTestDataMutation } from "@/redux/api/dashboard/dashboardApi";
import { getApiErrorMessage } from "@/utils/formatMoney";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ResetTestDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ResetTestDataForm({ onClose }: { onClose: () => void }) {
  const [confirmText, setConfirmText] = useState("");
  const [includeMembers, setIncludeMembers] = useState(false);

  const [resetTestData, { isLoading }] = useResetTestDataMutation();

  const canConfirm = confirmText.trim() === "RESET";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfirm) {
      toast.error('Please type "RESET" to confirm');
      return;
    }

    try {
      await resetTestData({
        confirmText: confirmText.trim(),
        includeMembers,
      }).unwrap();
      toast.success("Test database cleaned successfully");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to clean test data"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start gap-2.5 p-3 rounded border border-error/25 bg-error-5 text-xs text-error">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">Temporary Testing Utility</p>
          <p className="text-foreground/85 leading-relaxed">
            This will permanently erase all{" "}
            <strong>
              Deposits, Returns, Transfers, Charges, Monthly Targets, Payment
              Accounts, and Activity Logs
            </strong>{" "}
            so you can start fresh testing. Your own Admin account is always
            preserved.
          </p>
        </div>
      </div>

      <label
        htmlFor="reset-include-members"
        className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none"
      >
        <Checkbox
          id="reset-include-members"
          checked={includeMembers}
          onCheckedChange={(checked) => setIncludeMembers(checked === true)}
        />
        <span>
          Also delete all other test members (keeps your Admin account)
        </span>
      </label>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-description">
          Type <span className="font-mono font-bold text-error">RESET</span> to
          confirm
        </label>
        <input
          type="text"
          placeholder="RESET"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full h-9 px-3 rounded border border-input bg-card text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-error/20 focus:border-error"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-end pt-3 border-t border-border">
        <CustomButton
          type="button"
          variant="outline"
          btnText="Cancel"
          disabled={isLoading}
          onClick={onClose}
          className="w-full sm:w-auto px-5 rounded border-border bg-card text-foreground hover:bg-muted cursor-pointer shadow-none"
        />
        <CustomButton
          type="submit"
          btnText="Clean Database"
          loading={isLoading}
          disabled={!canConfirm || isLoading}
          className="w-full sm:w-auto px-5 rounded bg-error text-white hover:bg-error-80 cursor-pointer disabled:opacity-50"
        />
      </div>
    </form>
  );
}

/**
 * Admin-only modal for wiping test ledger records during staging/testing.
 */
export default function ResetTestDataModal({
  isOpen,
  onClose,
}: ResetTestDataModalProps) {
  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset Test Database"
      subtitle="Clear test transactions while keeping your Admin login intact"
      className="max-w-md"
    >
      {isOpen && <ResetTestDataForm onClose={onClose} />}
    </CustomModal>
  );
}
