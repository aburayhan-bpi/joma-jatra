"use client";

import AppSelect from "@/components/shared/AppSelect";
import CancelSubmitButton from "@/components/shared/CancelSubmitButton";
import CustomModal from "@/components/shared/CustomModal";
import ProofUploadField from "@/components/shared/ProofUploadField";
import {
  useCreateChargeMutation,
  useGetPaymentAccountsQuery,
} from "@/redux/api/accounts/accountsApi";
import {
  formatTaka,
  getApiErrorMessage,
  getPaymentMethodLabel,
} from "@/utils/formatMoney";
import { useState } from "react";
import { toast } from "sonner";

interface ChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ChargeForm({ onClose }: { onClose: () => void }) {
  const { data: accountsRes } = useGetPaymentAccountsQuery({
    isActive: true,
    limit: 100,
  });
  const [createCharge, { isLoading }] = useCreateChargeMutation();

  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [chargeDate, setChargeDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [proofImage, setProofImage] = useState("");
  const [note, setNote] = useState("");

  const accounts = accountsRes?.data || [];
  const activeAccountId = paymentAccountId || accounts[0]?.id || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);

    if (!activeAccountId) {
      toast.error("Please select an account");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a charge title");
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      toast.error("Please enter a valid charge amount");
      return;
    }

    try {
      await createCharge({
        paymentAccountId: activeAccountId,
        title: title.trim(),
        amount: numericAmount,
        chargeDate,
        proofImage: proofImage || undefined,
        note: note.trim() || undefined,
      }).unwrap();
      toast.success("Account charge recorded");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to record charge"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-description">
          Charged Account
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
          Charge Title
        </label>
        <input
          type="text"
          required
          placeholder="e.g. Half-yearly Bank Maintenance Fee"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Amount (BDT)
          </label>
          <input
            type="number"
            min={1}
            step="any"
            required
            placeholder="e.g. 230"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full h-9 px-3 rounded border border-input bg-card text-sm font-money text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Date
          </label>
          <input
            type="date"
            value={chargeDate}
            onChange={(e) => setChargeDate(e.target.value)}
            className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      <ProofUploadField
        value={proofImage}
        onChange={setProofImage}
        label="Statement / SMS Proof (Optional)"
      />

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-description">
          Note (Optional)
        </label>
        <input
          type="text"
          placeholder="Optional details..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <CancelSubmitButton
        handleCancel={onClose}
        loading={isLoading}
        submitText="Record Charge"
      />
    </form>
  );
}

/**
 * Record Standalone Account Charge Modal (Admin & Cashier)
 */
export default function ChargeModal({ isOpen, onClose }: ChargeModalProps) {
  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Account Charge"
      subtitle="Deduct bank SMS fees, maintenance fees, or other account charges"
      className="max-w-md"
    >
      {isOpen && <ChargeForm onClose={onClose} />}
    </CustomModal>
  );
}
