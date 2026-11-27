"use client";

import AppSelect from "@/components/shared/AppSelect";
import CancelSubmitButton from "@/components/shared/CancelSubmitButton";
import CustomModal from "@/components/shared/CustomModal";
import ProofUploadField from "@/components/shared/ProofUploadField";
import {
  useCreateChargeMutation,
  useGetPaymentAccountsQuery,
} from "@/redux/api/accounts/accountsApi";
import { useGetMembersQuery } from "@/redux/api/members/membersApi";
import {
  formatTaka,
  getApiErrorMessage,
  getPaymentMethodLabel,
  getTodayDateInputValue,
} from "@/utils/formatMoney";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ChargeForm({ onClose }: { onClose: () => void }) {
  // Include non-deleted accounts (including inactive ones) so bank charges can be logged
  const { data: accountsRes } = useGetPaymentAccountsQuery({
    limit: 100,
  });
  const { data: membersRes } = useGetMembersQuery({
    limit: 100,
    status: "ACTIVE",
  });
  const [createCharge, { isLoading }] = useCreateChargeMutation();

  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [chargeDate, setChargeDate] = useState(getTodayDateInputValue());
  const [proofImage, setProofImage] = useState("");
  const [note, setNote] = useState("");

  const accounts = accountsRes?.data || [];
  const activeAccountId = paymentAccountId || accounts[0]?.id || "";

  const activeEligibleMembers = (membersRes?.data || []).filter(
    (m) => m.status === "ACTIVE" && !m.isDeleted && m.financialSummary.netBalance > 0,
  );
  const activeTotalBalance =
    Math.round(
      activeEligibleMembers.reduce(
        (sum, m) => sum + m.financialSummary.netBalance,
        0,
      ) * 100,
    ) / 100;
  const numericAmount = Number(amount || 0);
  const isActiveInsufficient =
    Boolean(membersRes) && numericAmount > 0 && activeTotalBalance < numericAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
    if (isActiveInsufficient) {
      toast.error(
        `Active members' combined balance (${formatTaka(activeTotalBalance)}) is less than ${formatTaka(numericAmount)}.`,
      );
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
            label: `${acc.accountName} (${getPaymentMethodLabel(acc.method)})${!acc.isActive ? " [Inactive]" : ""} — ${formatTaka(acc.balance)}`,
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
        folder="joma-jatra/charges"
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

      {membersRes && (
        <div
          className={`text-[11px] p-2.5 rounded border ${
            isActiveInsufficient
              ? "bg-error-5 border-error/30 text-error"
              : "bg-muted/40 border-border text-text-description"
          }`}
        >
          {isActiveInsufficient ? (
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Active members&apos; combined net balance is{" "}
                <strong className="font-money">
                  {formatTaka(activeTotalBalance)}
                </strong>
                . Former members&apos; balances and Donated Reserve are
                protected from charges.
              </span>
            </div>
          ) : (
            <span>
              Will split pro-rata by balance across{" "}
              <strong className="text-foreground">
                {activeEligibleMembers.length}
              </strong>{" "}
              active member(s) (
              <strong className="font-money">
                {formatTaka(activeTotalBalance)}
              </strong>{" "}
              total active balance). Donated Reserve &amp; former members are
              untouched.
            </span>
          )}
        </div>
      )}

      <CancelSubmitButton
        handleCancel={onClose}
        loading={isLoading}
        disabled={isActiveInsufficient}
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
