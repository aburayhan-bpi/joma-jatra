"use client";

import AppSelect from "@/components/shared/AppSelect";
import CancelSubmitButton from "@/components/shared/CancelSubmitButton";
import CustomModal from "@/components/shared/CustomModal";
import ProofUploadField from "@/components/shared/ProofUploadField";
import { useGetPaymentAccountsQuery } from "@/redux/api/accounts/accountsApi";
import { useDeactivateMemberMutation } from "@/redux/api/members/membersApi";
import { MemberDeactivateAction } from "@/types/backend";
import { IMember } from "@/types/global";
import {
  formatTaka,
  getApiErrorMessage,
  getPaymentMethodLabel,
} from "@/utils/formatMoney";
import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface DeactivateMemberModalProps {
  member: IMember | null;
  onClose: () => void;
}

function DeactivateMemberForm({
  member,
  onClose,
}: {
  member: IMember;
  onClose: () => void;
}) {
  const { data: accountsRes } = useGetPaymentAccountsQuery({
    isActive: true,
    limit: 100,
  });
  const [deactivateMember, { isLoading }] = useDeactivateMemberMutation();

  const netBalance = member.financialSummary.netBalance || 0;
  const pendingTotal =
    (member.financialSummary.pendingDepositsCount || 0) +
    (member.financialSummary.pendingReturnsCount || 0);

  const [action, setAction] = useState<MemberDeactivateAction>(
    netBalance > 0 ? "SETTLE_AND_CLOSE" : "DEACTIVATE_ONLY",
  );
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [recipientAccount, setRecipientAccount] = useState("");
  const [trxId, setTrxId] = useState("");
  const [proofImage, setProofImage] = useState("");
  const [leaveNote, setLeaveNote] = useState("");

  const accounts = accountsRes?.data || [];
  const activeAccountId = paymentAccountId || accounts[0]?.id || "";
  const selectedAccount = accounts.find((a) => a.id === activeAccountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pendingTotal > 0) {
      toast.error(
        "Resolve this member's pending deposits/returns before closing.",
      );
      return;
    }

    if (action === "SETTLE_AND_CLOSE" && netBalance > 0 && !activeAccountId) {
      toast.error("Please select a payment account for the settlement payout");
      return;
    }

    try {
      await deactivateMember({
        id: member.id,
        action: netBalance > 0 ? action : "DEACTIVATE_ONLY",
        leaveNote: leaveNote.trim() || undefined,
        paymentAccountId:
          action === "SETTLE_AND_CLOSE" && netBalance > 0
            ? activeAccountId
            : undefined,
        paymentMethod:
          action === "SETTLE_AND_CLOSE" && netBalance > 0
            ? selectedAccount?.method
            : undefined,
        recipientAccount:
          action === "SETTLE_AND_CLOSE"
            ? recipientAccount.trim() || undefined
            : undefined,
        trxId:
          action === "SETTLE_AND_CLOSE"
            ? trxId.trim() || undefined
            : undefined,
        proofImage:
          action === "SETTLE_AND_CLOSE" ? proofImage || undefined : undefined,
      }).unwrap();
      toast.success(`${member.name} has been deactivated`);
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to close member account"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {pendingTotal > 0 && (
        <div className="flex items-start gap-2.5 p-3 rounded bg-error-5 border border-error/25 text-xs text-error">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            This member currently has <strong>{pendingTotal}</strong> pending
            deposit/return request(s). Please approve or reject them before
            closing this member.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 p-3.5 rounded bg-muted/60 border border-border text-xs">
        <div>
          <p className="text-muted-foreground">Total Saved</p>
          <p className="font-semibold text-foreground font-money mt-0.5">
            {formatTaka(member.financialSummary.totalDeposited)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Returned</p>
          <p className="font-semibold text-foreground font-money mt-0.5">
            {formatTaka(member.financialSummary.totalReturned)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Net Balance</p>
          <p className="font-semibold text-primary font-money mt-0.5">
            {formatTaka(netBalance)}
          </p>
        </div>
      </div>

      {netBalance > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-description">
            How would you like to handle the remaining{" "}
            <strong className="font-money text-foreground">
              {formatTaka(netBalance)}
            </strong>
            ?
          </p>

          {(
            [
              {
                value: "SETTLE_AND_CLOSE" as const,
                title: "Settle & Close Now (Recommended)",
                desc: `Return full ${formatTaka(netBalance)} from a payment account now and mark member closed.`,
              },
              {
                value: "DEACTIVATE_ONLY" as const,
                title: "Close Now & Settle Later (Unsettled Payable)",
                desc: `Deactivate member immediately and keep ${formatTaka(netBalance)} tracked under Unsettled Payable.`,
              },
              {
                value: "DONATE_AND_CLOSE" as const,
                title: "Donate Remaining Balance to Group Fund",
                desc: `Member voluntarily waives ${formatTaka(netBalance)} so cash stays in the group fund.`,
              },
            ] as const
          ).map((option) => {
            const selected = action === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setAction(option.value)}
                className={`w-full text-left flex items-start gap-2.5 p-3 rounded border transition-colors cursor-pointer ${
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-muted/40"
                }`}
              >
                {selected ? (
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-0.5" />
                )}
                <div className="text-xs">
                  <p className="font-semibold text-foreground">{option.title}</p>
                  <p className="text-muted-foreground mt-0.5">{option.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {netBalance > 0 && action === "SETTLE_AND_CLOSE" && (
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-description">
              Pay Settlement From Account
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text-description">
                Recipient Account (Optional)
              </label>
              <input
                type="text"
                placeholder="bKash / Bank number"
                value={recipientAccount}
                onChange={(e) => setRecipientAccount(e.target.value)}
                className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text-description">
                TrxID (Optional)
              </label>
              <input
                type="text"
                placeholder="Settlement TrxID"
                value={trxId}
                onChange={(e) => setTrxId(e.target.value)}
                className="w-full h-9 px-3 rounded border border-input bg-card text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>
          </div>

          <ProofUploadField
            value={proofImage}
            onChange={setProofImage}
            label="Settlement Proof Screenshot (Optional)"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-description">
          Leave / Closure Note (Optional)
        </label>
        <input
          type="text"
          placeholder="e.g. Member relocated and exited savings group"
          value={leaveNote}
          onChange={(e) => setLeaveNote(e.target.value)}
          className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <CancelSubmitButton
        handleCancel={onClose}
        loading={isLoading}
        submitText="Confirm Close Member"
      />
    </form>
  );
}

/**
 * Smart Close / Deactivate Member Modal (Admin only)
 */
export default function DeactivateMemberModal({
  member,
  onClose,
}: DeactivateMemberModalProps) {
  return (
    <CustomModal
      isOpen={Boolean(member)}
      onClose={onClose}
      title="Close / Deactivate Member"
      subtitle={member ? `${member.name} (${member.email})` : undefined}
      className="max-w-lg"
    >
      {member && (
        <DeactivateMemberForm
          key={member.id}
          member={member}
          onClose={onClose}
        />
      )}
    </CustomModal>
  );
}
