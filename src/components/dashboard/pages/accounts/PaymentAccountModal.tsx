"use client";

import AppSelect from "@/components/shared/AppSelect";
import CancelSubmitButton from "@/components/shared/CancelSubmitButton";
import CustomModal from "@/components/shared/CustomModal";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useCreatePaymentAccountMutation,
  useUpdatePaymentAccountMutation,
} from "@/redux/api/accounts/accountsApi";
import {
  PAYMENT_ACCOUNT_TYPES,
  PAYMENT_METHODS,
  PaymentAccountType,
  PaymentMethodType,
} from "@/types/backend";
import { IPaymentAccount } from "@/types/global";
import {
  getApiErrorMessage,
  getPaymentMethodLabel,
} from "@/utils/formatMoney";
import { useState } from "react";
import { toast } from "sonner";

interface PaymentAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingAccount?: IPaymentAccount | null;
}

function PaymentAccountForm({
  onClose,
  editingAccount,
}: Omit<PaymentAccountModalProps, "isOpen">) {
  const isEditing = Boolean(editingAccount);

  const [createAccount, { isLoading: isCreating }] =
    useCreatePaymentAccountMutation();
  const [updateAccount, { isLoading: isUpdating }] =
    useUpdatePaymentAccountMutation();

  const [method, setMethod] = useState<PaymentMethodType>(
    editingAccount?.method || "BKASH",
  );
  const [accountName, setAccountName] = useState(
    editingAccount?.accountName || "",
  );
  const [accountNumber, setAccountNumber] = useState(
    editingAccount?.accountNumber || "",
  );
  const [accountType, setAccountType] = useState<PaymentAccountType>(
    editingAccount?.accountType || "PERSONAL",
  );
  const [bankName, setBankName] = useState(editingAccount?.bankName || "");
  const [branchName, setBranchName] = useState(
    editingAccount?.branchName || "",
  );
  const [routingNumber, setRoutingNumber] = useState(
    editingAccount?.routingNumber || "",
  );
  const [note, setNote] = useState(editingAccount?.note || "");
  const [isActive, setIsActive] = useState(editingAccount?.isActive ?? true);

  const handleMethodChange = (nextMethod: PaymentMethodType) => {
    setMethod(nextMethod);
    if (nextMethod === "CASH") setAccountType("CASH");
    else if (nextMethod === "BANK_TRANSFER") setAccountType("BANK");
    else if (accountType === "CASH" || accountType === "BANK") {
      setAccountType("PERSONAL");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim() || !accountNumber.trim()) {
      toast.error("Account name and number are required");
      return;
    }

    const payload = {
      method,
      accountName: accountName.trim(),
      accountNumber: accountNumber.trim(),
      accountType,
      bankName:
        method === "BANK_TRANSFER" ? bankName.trim() || undefined : undefined,
      branchName:
        method === "BANK_TRANSFER" ? branchName.trim() || undefined : undefined,
      routingNumber:
        method === "BANK_TRANSFER"
          ? routingNumber.trim() || undefined
          : undefined,
      note: note.trim() || undefined,
      isActive,
    };

    try {
      if (isEditing && editingAccount) {
        await updateAccount({ id: editingAccount.id, ...payload }).unwrap();
        toast.success("Payment account updated");
      } else {
        await createAccount(payload).unwrap();
        toast.success("Payment account created");
      }
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save payment account"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Payment Method
          </label>
          <AppSelect
            value={method}
            onChange={(val) => handleMethodChange(val as PaymentMethodType)}
            options={PAYMENT_METHODS.map((m) => ({
              value: m,
              label: getPaymentMethodLabel(m),
            }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Account Type
          </label>
          <AppSelect
            value={accountType}
            onChange={(val) => setAccountType(val as PaymentAccountType)}
            options={PAYMENT_ACCOUNT_TYPES.map((t) => ({
              value: t,
              label: t,
            }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Account Holder / Label
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Rayhan bKash Personal"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Account Number / Wallet ID
          </label>
          <input
            type="text"
            required
            placeholder={
              method === "CASH" ? "e.g. CASH-BOX-01" : "e.g. 01719857898"
            }
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="w-full h-9 px-3 rounded border border-input bg-card text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      {method === "BANK_TRANSFER" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-description">
              Bank Name
            </label>
            <input
              type="text"
              placeholder="e.g. Dutch-Bangla"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-description">
              Branch
            </label>
            <input
              type="text"
              placeholder="e.g. Mirpur-10"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-description">
              Routing No.
            </label>
            <input
              type="text"
              placeholder="Optional"
              value={routingNumber}
              onChange={(e) => setRoutingNumber(e.target.value)}
              className="w-full h-9 px-3 rounded border border-input bg-card text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-description">
          Note (Optional)
        </label>
        <input
          type="text"
          placeholder="e.g. Send Money only, include your name in reference"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </div>

      {isEditing && (
        <label
          htmlFor="account-is-active"
          className="inline-flex items-center gap-2 text-xs text-foreground cursor-pointer select-none"
        >
          <Checkbox
            id="account-is-active"
            checked={isActive}
            onCheckedChange={(checked) => setIsActive(checked === true)}
          />
          <span>Account is active for new deposits</span>
        </label>
      )}

      <CancelSubmitButton
        handleCancel={onClose}
        loading={isCreating || isUpdating}
        submitText={isEditing ? "Save Account" : "Add Account"}
      />
    </form>
  );
}

/**
 * Create / Edit Payment Account Modal (Admin & Cashier)
 */
export default function PaymentAccountModal({
  isOpen,
  onClose,
  editingAccount,
}: PaymentAccountModalProps) {
  const isEditing = Boolean(editingAccount);

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Payment Account" : "Add Payment Account"}
      subtitle="Add a Cash hand, MFS number, or Bank account to track group funds"
      className="max-w-lg"
    >
      {isOpen && (
        <PaymentAccountForm
          key={editingAccount?.id || "new-account"}
          onClose={onClose}
          editingAccount={editingAccount}
        />
      )}
    </CustomModal>
  );
}
