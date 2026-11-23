"use client";

import AppSelect from "@/components/shared/AppSelect";
import CancelSubmitButton from "@/components/shared/CancelSubmitButton";
import CustomModal from "@/components/shared/CustomModal";
import ProofUploadField from "@/components/shared/ProofUploadField";
import { useGetPaymentAccountsQuery } from "@/redux/api/accounts/accountsApi";
import {
  useCreateDepositMutation,
  useUpdateDepositMutation,
} from "@/redux/api/deposits/depositsApi";
import { useGetMembersQuery } from "@/redux/api/members/membersApi";
import { selectCurrentUser } from "@/redux/features/user/authSlice";
import { useAppSelector } from "@/redux/hooks";
import { IDeposit } from "@/types/global";
import {
  getApiErrorMessage,
  getCurrentYearMonth,
  getPaymentMethodLabel,
} from "@/utils/formatMoney";
import { useState } from "react";
import { toast } from "sonner";

interface DepositFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingDeposit?: IDeposit | null;
}

function DepositForm({
  onClose,
  editingDeposit,
}: Omit<DepositFormModalProps, "isOpen">) {
  const user = useAppSelector(selectCurrentUser);
  const isManager = user?.role === "ADMIN" || user?.role === "CASHIER";
  const isEditing = Boolean(editingDeposit);

  const { data: accountsRes } = useGetPaymentAccountsQuery({
    isActive: true,
    limit: 100,
  });
  const { data: membersRes } = useGetMembersQuery(
    { status: "ACTIVE", limit: 100 },
    { skip: !isManager || isEditing },
  );

  const [createDeposit, { isLoading: isCreating }] = useCreateDepositMutation();
  const [updateDeposit, { isLoading: isUpdating }] = useUpdateDepositMutation();

  const [memberId, setMemberId] = useState(
    editingDeposit
      ? editingDeposit.memberId?._id || editingDeposit.memberId?.id || ""
      : user?.id || "",
  );
  const [amount, setAmount] = useState(
    editingDeposit ? String(editingDeposit.amount) : "",
  );
  const [month, setMonth] = useState(
    editingDeposit?.month || getCurrentYearMonth(),
  );
  const [depositDate, setDepositDate] = useState(
    editingDeposit?.depositDate
      ? new Date(editingDeposit.depositDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [paymentAccountId, setPaymentAccountId] = useState(
    editingDeposit
      ? editingDeposit.paymentAccountId?._id ||
          editingDeposit.paymentAccountId?.id ||
          ""
      : "",
  );
  const [trxId, setTrxId] = useState(editingDeposit?.trxId || "");
  const [proofImage, setProofImage] = useState(editingDeposit?.proofImage || "");
  const [note, setNote] = useState(editingDeposit?.note || "");
  const [editReason, setEditReason] = useState("");

  const accounts = accountsRes?.data || [];
  const members = membersRes?.data || [];

  // Default to the first active account cleanly without useEffect
  const activeAccountId = paymentAccountId || accounts[0]?.id || "";
  const selectedAccount = accounts.find((a) => a.id === activeAccountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      toast.error("Please enter a valid deposit amount");
      return;
    }
    if (!activeAccountId) {
      toast.error("Please select a payment account");
      return;
    }

    try {
      if (isEditing && editingDeposit) {
        await updateDeposit({
          id: editingDeposit.id,
          amount: numericAmount,
          month,
          depositDate,
          paymentAccountId: activeAccountId,
          paymentMethod: selectedAccount?.method,
          trxId: trxId.trim() || undefined,
          proofImage: proofImage || undefined,
          note: note.trim() || undefined,
          editReason: editReason.trim() || undefined,
        }).unwrap();
        toast.success("Deposit updated successfully");
      } else {
        await createDeposit({
          memberId: isManager && memberId ? memberId : undefined,
          amount: numericAmount,
          month,
          depositDate,
          paymentAccountId: activeAccountId,
          paymentMethod: selectedAccount?.method,
          trxId: trxId.trim() || undefined,
          proofImage: proofImage || undefined,
          note: note.trim() || undefined,
        }).unwrap();
        toast.success(
          isManager && memberId !== user?.id
            ? "Deposit recorded & approved"
            : "Deposit submitted for approval",
        );
      }
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save deposit"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isManager && !isEditing && (
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Member
          </label>
          <AppSelect
            value={memberId}
            onChange={setMemberId}
            placeholder="Select member..."
            options={members.map((m) => ({
              value: m.id,
              label: `${m.name} (${m.role})${m.id === user?.id ? " — You" : ""}`,
            }))}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Amount (BDT)
          </label>
          <input
            type="number"
            min={1}
            step="any"
            required
            placeholder="e.g. 2000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground font-money focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Savings Month
          </label>
          <input
            type="month"
            required
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Payment Account
          </label>
          <AppSelect
            value={activeAccountId}
            onChange={setPaymentAccountId}
            placeholder="Select account..."
            options={accounts.map((acc) => ({
              value: acc.id,
              label: `${acc.accountName} (${getPaymentMethodLabel(acc.method)})`,
            }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Deposit Date
          </label>
          <input
            type="date"
            required
            value={depositDate}
            onChange={(e) => setDepositDate(e.target.value)}
            className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      {selectedAccount && (
        <div className="rounded bg-muted/60 border border-border px-3 py-2 text-xs flex items-center justify-between">
          <span className="text-muted-foreground">
            Send to:{" "}
            <strong className="text-foreground">
              {selectedAccount.accountName}
            </strong>
          </span>
          <span className="font-mono font-semibold text-primary">
            {selectedAccount.accountNumber}
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-description">
          Transaction ID / TrxID (Optional for Cash)
        </label>
        <input
          type="text"
          placeholder="e.g. BK9X72KL01"
          value={trxId}
          onChange={(e) => setTrxId(e.target.value)}
          className="w-full h-9 px-3 rounded border border-input bg-card text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <ProofUploadField value={proofImage} onChange={setProofImage} />

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-description">
          Note (Optional)
        </label>
        <input
          type="text"
          placeholder="Any additional reference..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </div>

      {isEditing && isManager && (
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Reason for Edit (Optional — saved to Audit Log)
          </label>
          <input
            type="text"
            placeholder="e.g. Corrected typo in amount or TrxID"
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
      )}

      <CancelSubmitButton
        handleCancel={onClose}
        loading={isCreating || isUpdating}
        submitText={isEditing ? "Save Changes" : "Submit Deposit"}
      />
    </form>
  );
}

/**
 * Create / Edit Deposit Modal
 */
export default function DepositFormModal({
  isOpen,
  onClose,
  editingDeposit,
}: DepositFormModalProps) {
  const user = useAppSelector(selectCurrentUser);
  const isManager = user?.role === "ADMIN" || user?.role === "CASHIER";
  const isEditing = Boolean(editingDeposit);

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Deposit" : "Add Deposit"}
      subtitle={
        isEditing
          ? "Changes are logged in the member's audit trail"
          : isManager
            ? "Manual deposits for other members are approved immediately"
            : "Submit your payment details for Admin/Cashier verification"
      }
      className="max-w-lg"
    >
      {isOpen && (
        <DepositForm
          key={editingDeposit?.id || "new-deposit"}
          onClose={onClose}
          editingDeposit={editingDeposit}
        />
      )}
    </CustomModal>
  );
}
