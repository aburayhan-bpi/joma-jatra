"use client";

import AppSelect from "@/components/shared/AppSelect";
import CancelSubmitButton from "@/components/shared/CancelSubmitButton";
import CustomModal from "@/components/shared/CustomModal";
import PayoutFeeField from "@/components/shared/PayoutFeeField";
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
  toDateInputValue,
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
  // Include inactive/former members so Admin/Cashier can settle or edit any member's return with accurate balance
  const { data: membersRes } = useGetMembersQuery(
    { limit: 100, includeDeleted: true },
    { skip: !isManager },
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
  const [payoutFee, setPayoutFee] = useState(
    editingReturn?.payoutFee ? String(editingReturn.payoutFee) : "0",
  );
  const [returnType, setReturnType] = useState<ReturnType>(
    editingReturn?.returnType || "PARTIAL",
  );
  const [returnDate, setReturnDate] = useState(
    toDateInputValue(editingReturn?.returnDate),
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

  const isEditingApproved = isEditing && editingReturn?.status === "APPROVED";
  const targetMemberId = isManager ? memberId || user?.id || "" : user?.id || "";
  const isDirectPayout =
    !isEditing &&
    (user?.role === "ADMIN" ||
      (user?.role === "CASHIER" &&
        Boolean(targetMemberId) &&
        targetMemberId !== user?.id));
  // Self return requests cannot be DONATED_WAIVER; coerce safely if Cashier switches back to self
  const effectiveReturnType: ReturnType =
    !isEditing && !isDirectPayout && returnType === "DONATED_WAIVER"
      ? "PARTIAL"
      : returnType;
  const requiresPayoutAccount =
    isDirectPayout && effectiveReturnType !== "DONATED_WAIVER";
  const showPayoutMetadataFields =
    requiresPayoutAccount ||
    (isEditingApproved && effectiveReturnType !== "DONATED_WAIVER");

  const activeAccountId = paymentAccountId || accounts[0]?.id || "";
  const selectedAccount = accounts.find((a) => a.id === activeAccountId);

  const selectedMember = members.find((m) => m.id === targetMemberId);
  const availableBalance = isManager
    ? selectedMember?.financialSummary.netBalance ??
      (targetMemberId === user?.id
        ? meRes?.data?.financialSummary.netBalance ?? 0
        : 0)
    : meRes?.data?.financialSummary.netBalance ?? 0;
  const pendingReturnsCount = isManager
    ? selectedMember?.financialSummary.pendingReturnsCount ??
      (targetMemberId === user?.id
        ? meRes?.data?.financialSummary.pendingReturnsCount ?? 0
        : 0)
    : meRes?.data?.financialSummary.pendingReturnsCount ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = isEditingApproved
      ? Number(editingReturn?.amount || 0)
      : Number(amount);
    const numericFee = showPayoutMetadataFields ? Number(payoutFee || 0) : 0;

    if (!isEditingApproved && (!numericAmount || numericAmount < 0.01)) {
      toast.error("Return amount must be at least ৳0.01");
      return;
    }
    if (requiresPayoutAccount && !activeAccountId) {
      toast.error("Please select the payout payment account");
      return;
    }
    if (
      showPayoutMetadataFields &&
      (Number.isNaN(numericFee) || numericFee < 0 || numericFee >= numericAmount)
    ) {
      toast.error("Payout fee must be at least ৳0 and less than the return amount");
      return;
    }

    try {
      if (isEditing && editingReturn) {
        const chosenAccount =
          returnType !== "DONATED_WAIVER" && paymentAccountId
            ? accounts.find((a) => a.id === paymentAccountId)
            : undefined;
        await updateReturn({
          id: editingReturn.id,
          // Amount is locked once a return is approved; only metadata can be updated
          ...(isEditingApproved ? {} : { amount: numericAmount }),
          payoutFee:
            isEditingApproved && returnType !== "DONATED_WAIVER"
              ? numericFee
              : undefined,
          recipientAccount:
            returnType === "DONATED_WAIVER" ? undefined : recipientAccount.trim(),
          reason: reason.trim(),
          paymentAccountId:
            returnType === "DONATED_WAIVER"
              ? undefined
              : paymentAccountId || undefined,
          paymentMethod:
            returnType === "DONATED_WAIVER" ? undefined : chosenAccount?.method,
          trxId: trxId.trim(),
          proofImage: proofImage.trim(),
        }).unwrap();
        toast.success("Return updated");
      } else {
        await createReturn({
          memberId: isManager && targetMemberId ? targetMemberId : undefined,
          amount: numericAmount,
          payoutFee: requiresPayoutAccount ? numericFee : 0,
          returnType: effectiveReturnType,
          returnDate,
          paymentAccountId: requiresPayoutAccount ? activeAccountId : undefined,
          paymentMethod: requiresPayoutAccount
            ? selectedAccount?.method
            : undefined,
          recipientAccount:
            effectiveReturnType === "DONATED_WAIVER"
              ? undefined
              : recipientAccount.trim() || undefined,
          trxId: requiresPayoutAccount ? trxId.trim() || undefined : undefined,
          proofImage: requiresPayoutAccount
            ? proofImage || undefined
            : undefined,
          reason: reason.trim() || undefined,
        }).unwrap();
        toast.success(
          effectiveReturnType === "DONATED_WAIVER"
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
            onChange={(nextMemberId) => {
              setMemberId(nextMemberId);
              // Reset DONATED_WAIVER when Cashier switches target back to themselves
              if (
                user?.role === "CASHIER" &&
                nextMemberId === user.id &&
                returnType === "DONATED_WAIVER"
              ) {
                setReturnType("PARTIAL");
              }
            }}
            placeholder="Select member..."
            options={members.map((m) => ({
              value: m.id,
              label: `${m.name} — Net ${formatTaka(m.financialSummary.netBalance)}${m.status !== "ACTIVE" ? ` (${m.status})` : ""}${m.id === user?.id ? " — You" : ""}`,
            }))}
          />
        </div>
      )}

      <div className="rounded bg-muted/60 border border-border px-3.5 py-2.5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Member Net Balance</span>
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
      {pendingReturnsCount > 0 && (
        <p className="-mt-2 text-[11px] text-muted-foreground">
          {pendingReturnsCount} pending return request
          {pendingReturnsCount === 1 ? "" : "s"} exist; the amount available to
          return may be lower than this balance.
        </p>
      )}
      {!isEditing && user?.role === "CASHIER" && (
        <p className="-mt-2 text-[11px] text-muted-foreground">
          {isDirectPayout
            ? "A return for another member is recorded as a payout immediately."
            : "Your own return is submitted for Admin approval; you cannot approve your own payout."}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Amount (BDT)
          </label>
          <input
            type="number"
            min={0.01}
            step="any"
            required
            disabled={isEditingApproved}
            placeholder="e.g. 5000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground font-money disabled:bg-muted/60 disabled:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
          {isEditingApproved && (
            <p className="text-[11px] text-muted-foreground">
              Approved return amount is locked. You can still update payout metadata below.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Return Type
          </label>
          <AppSelect
            value={effectiveReturnType}
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

      {showPayoutMetadataFields && (
        <div
          className={`grid grid-cols-1 ${isEditingApproved ? "" : "sm:grid-cols-2"} gap-3.5`}
        >
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

          {!isEditingApproved && (
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
          )}
        </div>
      )}

      {effectiveReturnType !== "DONATED_WAIVER" && (
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

      {showPayoutMetadataFields && (
        <>
          <PayoutFeeField
            grossAmount={
              isEditingApproved
                ? Number(editingReturn?.amount || 0)
                : Number(amount)
            }
            feeValue={payoutFee}
            onChange={setPayoutFee}
          />

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
      subtitle="Payouts are limited by the member's net balance and any pending return requests."
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
