"use client";

import CustomButton from "@/components/shared/CustomButton";
import CustomModal from "@/components/shared/CustomModal";
import { useReviewDepositMutation } from "@/redux/api/deposits/depositsApi";
import { IDeposit } from "@/types/global";
import { formatDate } from "@/utils/formatDate";
import {
  formatMonthLabel,
  formatTaka,
  getApiErrorMessage,
  getPaymentMethodLabel,
} from "@/utils/formatMoney";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

interface ReviewDepositModalProps {
  deposit: IDeposit | null;
  onClose: () => void;
}

/**
 * Modal for Admin / Cashier to Approve or Reject a pending deposit request.
 */
export default function ReviewDepositModal({
  deposit,
  onClose,
}: ReviewDepositModalProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewDeposit, { isLoading }] = useReviewDepositMutation();

  const handleDecision = async (status: "APPROVED" | "REJECTED") => {
    if (!deposit) return;
    if (status === "REJECTED" && !rejectionReason.trim()) {
      toast.error("Please enter a reason before rejecting");
      return;
    }

    try {
      await reviewDeposit({
        id: deposit.id,
        status,
        rejectionReason:
          status === "REJECTED" ? rejectionReason.trim() : undefined,
      }).unwrap();
      toast.success(
        status === "APPROVED" ? "Deposit approved" : "Deposit rejected",
      );
      setRejectionReason("");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to review deposit"));
    }
  };

  return (
    <CustomModal
      isOpen={Boolean(deposit)}
      onClose={onClose}
      title="Review Deposit Request"
      subtitle={deposit ? `Submitted by ${deposit.memberId?.name}` : undefined}
      className="max-w-lg"
    >
      {deposit && (
        <div className="space-y-4">
          {/* Transaction Summary Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded bg-muted/60 border border-border text-xs">
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="text-base font-semibold text-primary font-money mt-0.5">
                {formatTaka(deposit.amount)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Month & Date</p>
              <p className="font-medium text-foreground mt-0.5">
                {formatMonthLabel(deposit.month)} •{" "}
                {formatDate(deposit.depositDate)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Account</p>
              <p className="font-medium text-foreground mt-0.5">
                {deposit.paymentAccountId?.accountName} (
                {getPaymentMethodLabel(deposit.paymentMethod)})
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">TrxID</p>
              <p className="font-mono font-medium text-foreground mt-0.5 break-all">
                {deposit.trxId || "—"}
              </p>
            </div>
          </div>

          {/* Attached Proof Image */}
          {deposit.proofImage && (
            <div className="relative w-full h-64 rounded border border-border bg-background overflow-hidden">
              <Image
                src={deposit.proofImage}
                alt="Deposit proof"
                fill
                sizes="(max-width: 768px) 95vw, 480px"
                className="object-contain p-2"
              />
            </div>
          )}

          {deposit.note && (
            <p className="text-xs text-muted-foreground bg-background border border-border rounded px-3 py-2">
              <strong className="text-foreground">Member Note: </strong>
              {deposit.note}
            </p>
          )}

          {/* Optional Rejection Reason */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-description">
              Rejection Reason (required only if rejecting)
            </label>
            <input
              type="text"
              placeholder="e.g. TrxID not found in bKash statement"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>

          {/* Approve / Reject Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-3 border-t border-border">
            <CustomButton
              type="button"
              variant="outline"
              btnText="Reject"
              disabled={isLoading}
              onClick={() => handleDecision("REJECTED")}
              className="w-full sm:w-auto border-error/40 text-error hover:bg-error-5 hover:text-error cursor-pointer shadow-none"
            />
            <CustomButton
              type="button"
              btnText="Approve Deposit"
              loading={isLoading}
              onClick={() => handleDecision("APPROVED")}
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-brand-dark cursor-pointer"
            />
          </div>
        </div>
      )}
    </CustomModal>
  );
}
