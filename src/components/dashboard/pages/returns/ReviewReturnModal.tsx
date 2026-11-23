"use client";

import AppSelect from "@/components/shared/AppSelect";
import CustomButton from "@/components/shared/CustomButton";
import CustomModal from "@/components/shared/CustomModal";
import ProofUploadField from "@/components/shared/ProofUploadField";
import { useGetPaymentAccountsQuery } from "@/redux/api/accounts/accountsApi";
import { useReviewReturnMutation } from "@/redux/api/returns/returnsApi";
import { IDepositReturn } from "@/types/global";
import { formatDate } from "@/utils/formatDate";
import {
  formatTaka,
  getApiErrorMessage,
  getPaymentMethodLabel,
} from "@/utils/formatMoney";
import { useState } from "react";
import { toast } from "sonner";

interface ReviewReturnModalProps {
  returnEntry: IDepositReturn | null;
  onClose: () => void;
}

function ReviewReturnContent({
  returnEntry,
  onClose,
}: {
  returnEntry: IDepositReturn;
  onClose: () => void;
}) {
  const { data: accountsRes } = useGetPaymentAccountsQuery({
    isActive: true,
    limit: 100,
  });
  const [reviewReturn, { isLoading }] = useReviewReturnMutation();

  const [paymentAccountId, setPaymentAccountId] = useState(
    returnEntry.paymentAccountId?._id ||
      returnEntry.paymentAccountId?.id ||
      "",
  );
  const [trxId, setTrxId] = useState(returnEntry.trxId || "");
  const [proofImage, setProofImage] = useState(returnEntry.proofImage || "");
  const [rejectionReason, setRejectionReason] = useState("");

  const accounts = accountsRes?.data || [];
  const activeAccountId = paymentAccountId || accounts[0]?.id || "";
  const selectedAccount = accounts.find((a) => a.id === activeAccountId);

  const handleDecision = async (status: "APPROVED" | "REJECTED") => {
    if (status === "APPROVED" && !activeAccountId) {
      toast.error("Please select the payout payment account");
      return;
    }
    if (status === "REJECTED" && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      await reviewReturn({
        id: returnEntry.id,
        status,
        paymentAccountId: status === "APPROVED" ? activeAccountId : undefined,
        paymentMethod:
          status === "APPROVED" ? selectedAccount?.method : undefined,
        trxId: status === "APPROVED" ? trxId.trim() || undefined : undefined,
        proofImage: status === "APPROVED" ? proofImage || undefined : undefined,
        rejectionReason:
          status === "REJECTED" ? rejectionReason.trim() : undefined,
      }).unwrap();
      toast.success(
        status === "APPROVED"
          ? "Return approved & disbursed"
          : "Return request rejected",
      );
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to review return request"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 p-3.5 rounded bg-muted/60 border border-border text-xs">
        <div>
          <p className="text-muted-foreground">Requested Amount</p>
          <p className="text-base font-semibold text-secondary font-money mt-0.5">
            {formatTaka(returnEntry.amount)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Date & Type</p>
          <p className="font-medium text-foreground mt-0.5">
            {formatDate(returnEntry.returnDate)} •{" "}
            {returnEntry.returnType.replace(/_/g, " ")}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-muted-foreground">Recipient Account</p>
          <p className="font-medium text-foreground mt-0.5">
            {returnEntry.recipientAccount || "Not specified"}
          </p>
        </div>
        {returnEntry.reason && (
          <div className="col-span-2">
            <p className="text-muted-foreground">Reason</p>
            <p className="text-foreground mt-0.5">{returnEntry.reason}</p>
          </div>
        )}
      </div>

      <div className="space-y-3 pt-1">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Pay From Account (required to approve)
          </label>
          <AppSelect
            value={activeAccountId}
            onChange={setPaymentAccountId}
            placeholder="Select account..."
            options={accounts.map((acc) => ({
              value: acc.id,
              label: `${acc.accountName} (${getPaymentMethodLabel(acc.method)}) — ${formatTaka(acc.balance)}`,
            }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Payout TrxID (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. RT8X192KL"
            value={trxId}
            onChange={(e) => setTrxId(e.target.value)}
            className="w-full h-9 px-3 rounded border border-input bg-card text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <ProofUploadField
          value={proofImage}
          onChange={setProofImage}
          label="Payout Proof Screenshot (Optional)"
        />
      </div>

      <div className="space-y-1.5 pt-2 border-t border-border">
        <label className="block text-xs font-medium text-text-description">
          Rejection Reason (required only if rejecting)
        </label>
        <input
          type="text"
          placeholder="e.g. Wrong recipient number"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-2">
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
          btnText="Approve & Pay"
          loading={isLoading}
          onClick={() => handleDecision("APPROVED")}
          className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-brand-dark cursor-pointer"
        />
      </div>
    </div>
  );
}

/**
 * Modal for Admin / Cashier to Approve (with payout account + proof)
 * or Reject a pending member return request.
 */
export default function ReviewReturnModal({
  returnEntry,
  onClose,
}: ReviewReturnModalProps) {
  return (
    <CustomModal
      isOpen={Boolean(returnEntry)}
      onClose={onClose}
      title="Review Return Request"
      subtitle={
        returnEntry ? `Requested by ${returnEntry.memberId?.name}` : undefined
      }
      className="max-w-lg"
    >
      {returnEntry && (
        <ReviewReturnContent
          key={returnEntry.id}
          returnEntry={returnEntry}
          onClose={onClose}
        />
      )}
    </CustomModal>
  );
}
