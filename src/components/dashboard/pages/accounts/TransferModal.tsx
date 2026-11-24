"use client";

import AppSelect from "@/components/shared/AppSelect";
import CancelSubmitButton from "@/components/shared/CancelSubmitButton";
import CustomModal from "@/components/shared/CustomModal";
import ProofUploadField from "@/components/shared/ProofUploadField";
import {
  useCreateTransferMutation,
  useGetPaymentAccountsQuery,
} from "@/redux/api/accounts/accountsApi";
import {
  formatTaka,
  getApiErrorMessage,
  getPaymentMethodLabel,
  getTodayDateInputValue,
} from "@/utils/formatMoney";
import { useState } from "react";
import { toast } from "sonner";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function TransferForm({ onClose }: { onClose: () => void }) {
  // Include non-deleted accounts (including inactive ones) so funds can be transferred out
  const { data: accountsRes } = useGetPaymentAccountsQuery({
    limit: 100,
  });
  const [createTransfer, { isLoading }] = useCreateTransferMutation();

  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [transferFee, setTransferFee] = useState("0");
  const [transferDate, setTransferDate] = useState(getTodayDateInputValue());
  const [trxId, setTrxId] = useState("");
  const [proofImage, setProofImage] = useState("");
  const [note, setNote] = useState("");

  const accounts = accountsRes?.data || [];
  const activeFromId = fromAccountId || accounts[0]?.id || "";
  const activeToId = toAccountId || accounts[1]?.id || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    const numericFee = Number(transferFee || 0);

    if (!activeFromId || !activeToId) {
      toast.error("Please select both source and destination accounts");
      return;
    }
    if (activeFromId === activeToId) {
      toast.error("Source and destination accounts must be different");
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      toast.error("Please enter a valid transfer amount");
      return;
    }
    if (Number.isNaN(numericFee) || numericFee < 0) {
      toast.error("Transfer fee cannot be negative");
      return;
    }

    try {
      await createTransfer({
        fromAccountId: activeFromId,
        toAccountId: activeToId,
        amount: numericAmount,
        transferFee: numericFee,
        transferDate,
        trxId: trxId.trim() || undefined,
        proofImage: proofImage || undefined,
        note: note.trim() || undefined,
      }).unwrap();
      toast.success("Internal transfer recorded");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to record transfer"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            From Account
          </label>
          <AppSelect
            value={activeFromId}
            onChange={setFromAccountId}
            placeholder="Select source..."
            options={accounts.map((acc) => ({
              value: acc.id,
              label: `${acc.accountName} (${getPaymentMethodLabel(acc.method)})${!acc.isActive ? " [Inactive]" : ""} — ${formatTaka(acc.balance)}`,
            }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            To Account
          </label>
          <AppSelect
            value={activeToId}
            onChange={setToAccountId}
            placeholder="Select destination..."
            options={accounts.map((acc) => ({
              value: acc.id,
              label: `${acc.accountName} (${getPaymentMethodLabel(acc.method)})`,
            }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Amount (BDT)
          </label>
          <input
            type="number"
            min={1}
            step="any"
            required
            placeholder="e.g. 10000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full h-9 px-3 rounded border border-input bg-card text-sm font-money text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Cash-Out / Fee (BDT)
          </label>
          <input
            type="number"
            min={0}
            step="any"
            placeholder="0"
            value={transferFee}
            onChange={(e) => setTransferFee(e.target.value)}
            className="w-full h-9 px-3 rounded border border-input bg-card text-sm font-money text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Date
          </label>
          <input
            type="date"
            value={transferDate}
            onChange={(e) => setTransferDate(e.target.value)}
            className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-description">
          TrxID (Optional)
        </label>
        <input
          type="text"
          placeholder="e.g. TRF88219"
          value={trxId}
          onChange={(e) => setTrxId(e.target.value)}
          className="w-full h-9 px-3 rounded border border-input bg-card text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <ProofUploadField
        value={proofImage}
        onChange={setProofImage}
        label="Transfer Receipt / Screenshot (Optional)"
        folder="joma-jatra/transfers"
      />

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-description">
          Note (Optional)
        </label>
        <input
          type="text"
          placeholder="e.g. Cashed out from bKash to Bank savings account"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <CancelSubmitButton
        handleCancel={onClose}
        loading={isLoading}
        submitText="Record Transfer"
      />
    </form>
  );
}

/**
 * Record Internal Account Transfer Modal (Admin & Cashier)
 */
export default function TransferModal({ isOpen, onClose }: TransferModalProps) {
  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Internal Transfer"
      subtitle="Move funds between group accounts with optional cash-out fee"
      className="max-w-lg"
    >
      {isOpen && <TransferForm onClose={onClose} />}
    </CustomModal>
  );
}
