"use client";

import AppSelect from "@/components/shared/AppSelect";
import CancelSubmitButton from "@/components/shared/CancelSubmitButton";
import CustomModal from "@/components/shared/CustomModal";
import ProofUploadField from "@/components/shared/ProofUploadField";
import { useGetPaymentAccountsQuery } from "@/redux/api/accounts/accountsApi";
import { useGetMeQuery } from "@/redux/api/getMe/getMeApi";
import { useGetMembersQuery } from "@/redux/api/members/membersApi";
import {
  useCreateReturnMutation,
  useUpdateReturnMutation,
} from "@/redux/api/returns/returnsApi";
import { selectCurrentUser } from "@/redux/features/user/authSlice";
import { useAppSelector } from "@/redux/hooks";
import { ReturnType } from "@/types/backend";
import { IDepositReturn } from "@/types/global";
import {
  formatTaka,
  getApiErrorMessage,
  getPaymentMethodLabel,
} from "@/utils/formatMoney";
import { useState } from "react";
import { toast } from "sonner";

interface ReturnFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingReturn?: IDepositReturn | null;
  defaultMemberId?: string;
}

function ReturnForm({
  onClose,
  editingReturn,
  defaultMemberId,
}: Omit<ReturnFormModalProps, "isOpen">) {
  const user = useAppSelector(selectCurrentUser);
  const isManager = user?.role === "ADMIN" || user?.role === "CASHIER";
  const isEditing = Boolean(editingReturn);

  const { data: meRes } = useGetMeQuery();
  // Include inactive/former members so Admin/Cashier can settle unsettled former balances
  const { data: membersRes } = useGetMembersQuery(
    { limit: 100, includeDeleted: true },
    { skip: !isManager || isEditing },
  );
  // Include non-deleted accounts (even if inactive for new deposits) so held funds can be paid out
  const { data: accountsRes } = useGetPaymentAccountsQuery(
    { limit: 100 },
    { skip: !isManager },
  );

  const [createReturn, { isLoading: isCreating }] = useCreateReturnMutation();
  const [updateReturn, { isLoading: isUpdating }] = useUpdateReturnMutation();

  const [memberId, setMemberId] = useState(
    editingReturn
      ? editingReturn.memberId?._id || editingReturn.memberId?.id || ""
      : defaultMemberId || user?.id || "",
  );
  const [amount, setAmount] = useState(
    editingReturn ? String(editingReturn.amount) : "",
  );
  const [returnType, setReturnType] = useState<ReturnType>(
    editingReturn?.returnType || "PARTIAL",
  );
  const [returnDate, setReturnDate] = useState(
    editingReturn?.returnDate
      ? new Date(editingReturn.returnDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [paymentAccountId, setPaymentAccountId] = useState(
    editingReturn
      ? editingReturn.paymentAccountId?._id ||
          editingReturn.paymentAccountId?.id ||
          ""
      : "",
  );
  const [recipientAccount, setRecipientAccount] = useState(
    editingReturn?.recipientAccount || "",
  );
  const [trxId, setTrxId] = useState(editingReturn?.trxId || "");
  const [proofImage, setProofImage] = useState(editingReturn?.proofImage || "");
  const [reason, setReason] = useState(editingReturn?.reason || "");

  const members = membersRes?.data || [];
  const accounts = accountsRes?.data || [];

  const targetMemberId = isManager ? memberId || user?.id || "" : user?.id || "";
  const isDirectPayout =
    !isEditing &&
    (user?.role === "ADMIN" ||
      (user?.role === "CASHIER" &&
        Boolean(targetMemberId) &&
        targetMemberId !== user?.id));
  const requiresPayoutAccount = isDirectPayout && returnType !== "DONATED_WAIVER";

  const activeAccountId = paymentAccountId || accounts[0]?.id || "";
  const selectedAccount = accounts.find((a) => a.id === activeAccountId);

  const selectedMember = members.find((m) => m.id === targetMemberId);
  const availableBalance = isManager
    ? selectedMember?.financialSummary.netBalance ??
      meRes?.data?.financialSummary.netBalance ??
      0
    : meRes?.data?.financialSummary.netBalance ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      toast.error("Please enter a valid return amount");
      return;
    }
    if (requiresPayoutAccount && !activeAccountId) {
      toast.error("Please select the payout payment account");
      return;
    }

    try {
      if (isEditing && editingReturn) {
        const chosenAccount = paymentAccountId
          ? accounts.find((a) => a.id === paymentAccountId)
          : undefined;
        await updateReturn({
          id: editingReturn.id,
          amount: numericAmount,
          recipientAccount: recipientAccount.trim() || undefined,
          reason: reason.trim() || undefined,
          paymentAccountId: paymentAccountId || undefined,
          paymentMethod: chosenAccount?.method,
          trxId: trxId.trim() || undefined,
          proofImage: proofImage || undefined,
        }).unwrap();
        toast.success("Return updated");
      } else {
        await createReturn({
          memberId: isManager && targetMemberId ? targetMemberId : undefined,
          amount: numericAmount,
          returnType,
          returnDate,
          paymentAccountId: requiresPayoutAccount ? activeAccountId : undefined,
          paymentMethod: requiresPayoutAccount
            ? selectedAccount?.method
            : undefined,
          recipientAccount:
            returnType === "DONATED_WAIVER"
              ? undefined
              : recipientAccount.trim() || undefined,
          trxId: requiresPayoutAccount ? trxId.trim() || undefined : undefined,
          proofImage: requiresPayoutAccount
            ? proofImage || undefined
            : undefined,
          reason: reason.trim() || undefined,
        }).unwrap();
        toast.success(
          returnType === "DONATED_WAIVER"
            ? "Balance donation/waiver recorded"
            : isDirectPayout
              ? "Return processed & approved"
              : "Return request submitted for approval",
        );
      }
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save return"));
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
              label: `${m.name} — Net ${formatTaka(m.financialSummary.netBalance)}${m.status !== "ACTIVE" ? ` (${m.status})` : ""}${m.id === user?.id ? " — You" : ""}`,
            }))}
          />
        </div>
      )}

      <div className="rounded bg-muted/60 border border-border px-3.5 py-2.5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Available Net Balance</span>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-primary font-money text-sm">
            {formatTaka(availableBalance)}
          </span>
          {availableBalance > 0 && !isEditing && (
            <button
              type="button"
              onClick={() => {
                setAmount(String(availableBalance));
                setReturnType("FULL_SETTLEMENT");
              }}
              className="text-[11px] font-medium text-primary underline hover:text-brand-dark cursor-pointer"
            >
              Use Full
            </button>
          )}
        </div>
      </div>

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
            placeholder="e.g. 5000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground font-money focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Return Type
          </label>
          <AppSelect
            value={returnType}
            onChange={(val) => setReturnType(val as ReturnType)}
            disabled={isEditing}
            options={
              isDirectPayout
                ? [
                    { value: "PARTIAL", label: "Partial Return" },
                    { value: "FULL_SETTLEMENT", label: "Full Settlement" },
                    {
                      value: "DONATED_WAIVER",
                      label: "Donated / Waived to Group Fund",
                    },
                  ]
                : [
                    { value: "PARTIAL", label: "Partial Return" },
                    { value: "FULL_SETTLEMENT", label: "Full Settlement" },
                  ]
            }
          />
        </div>
      </div>

      {requiresPayoutAccount && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-description">
              Pay From Account
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
              Payout Date
            </label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>
      )}

      {returnType !== "DONATED_WAIVER" && (
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Recipient Number / Account (e.g. Member&apos;s bKash / Bank)
          </label>
          <input
            type="text"
            placeholder="e.g. bKash Personal 017XXXXXXXX"
            value={recipientAccount}
            onChange={(e) => setRecipientAccount(e.target.value)}
            className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
      )}

      {requiresPayoutAccount && (
        <>
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
            folder="joma-jatra/returns"
          />
        </>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-description">
          Reason / Note
        </label>
        <input
          type="text"
          placeholder="e.g. Personal emergency withdrawal or leaving settlement"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <CancelSubmitButton
        handleCancel={onClose}
        loading={isCreating || isUpdating}
        submitText={
          isEditing
            ? "Save Changes"
            : isDirectPayout
              ? "Confirm Payout"
              : "Submit Request"
        }
      />
    </form>
  );
}

/**
 * Create / Edit Return or Settlement Modal
 */
export default function ReturnFormModal({
  isOpen,
  onClose,
  editingReturn,
  defaultMemberId,
}: ReturnFormModalProps) {
  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingReturn ? "Edit Return Request" : "Return / Settlement"}
      subtitle="Cannot exceed the member's verified net balance"
      className="max-w-lg"
    >
      {isOpen && (
        <ReturnForm
          key={`${editingReturn?.id || "new"}-${defaultMemberId || ""}`}
          onClose={onClose}
          editingReturn={editingReturn}
          defaultMemberId={defaultMemberId}
        />
      )}
    </CustomModal>
  );
}
