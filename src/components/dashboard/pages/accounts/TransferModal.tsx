"use client";

import AppSelect from "@/components/shared/AppSelect";
import CancelSubmitButton from "@/components/shared/CancelSubmitButton";
import CustomModal from "@/components/shared/CustomModal";
import ProofUploadField from "@/components/shared/ProofUploadField";
import {
  useCreateTransferMutation,
  useGetPaymentAccountsQuery,
} from "@/redux/api/accounts/accountsApi";
import { useGetMembersQuery } from "@/redux/api/members/membersApi";
import { TransferFeeBearerType } from "@/types/backend";
import {
  formatTaka,
  getApiErrorMessage,
  getPaymentMethodLabel,
  getTodayDateInputValue,
} from "@/utils/formatMoney";
import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
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
  const [feeBearerType, setFeeBearerType] =
    useState<TransferFeeBearerType>("SHARED_PRO_RATA");
  const [feeBearerMemberId, setFeeBearerMemberId] = useState("");
  const [transferDate, setTransferDate] = useState(getTodayDateInputValue());
  const [trxId, setTrxId] = useState("");
  const [proofImage, setProofImage] = useState("");
  const [note, setNote] = useState("");

  const numericFee = Number(transferFee || 0);
  const hasFee = !Number.isNaN(numericFee) && numericFee > 0;

  // Load active + unsettled former members only when a transfer fee is entered
  const { data: membersRes } = useGetMembersQuery(
    { limit: 100, includeDeleted: true },
    { skip: !hasFee },
  );

  const accounts = accountsRes?.data || [];
  const activeFromId = fromAccountId || accounts[0]?.id || "";
  const activeToId = toAccountId || accounts[1]?.id || "";

  const allMembers = membersRes?.data || [];
  const activeEligibleMembers = allMembers.filter(
    (m) =>
      m.status === "ACTIVE" && !m.isDeleted && m.financialSummary.netBalance > 0,
  );
  const activeTotalBalance =
    Math.round(
      activeEligibleMembers.reduce(
        (sum, m) => sum + m.financialSummary.netBalance,
        0,
      ) * 100,
    ) / 100;

  const specificSelectableMembers = allMembers.filter(
    (m) => m.financialSummary.netBalance > 0,
  );
  const activeBearerMemberId =
    feeBearerMemberId || specificSelectableMembers[0]?.id || "";
  const selectedBearerMember = specificSelectableMembers.find(
    (m) => m.id === activeBearerMemberId,
  );

  const isProRataInsufficient = hasFee && feeBearerType === "SHARED_PRO_RATA" && membersRes && activeTotalBalance < numericFee;
  const isSpecificInsufficient =
    hasFee &&
    feeBearerType === "SPECIFIC_MEMBER" &&
    membersRes &&
    (!selectedBearerMember ||
      selectedBearerMember.financialSummary.netBalance < numericFee);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);

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
    if (hasFee && feeBearerType === "SHARED_PRO_RATA" && isProRataInsufficient) {
      toast.error(
        `Active members' combined balance (${formatTaka(activeTotalBalance)}) is less than the ${formatTaka(numericFee)} fee.`,
      );
      return;
    }
    if (hasFee && feeBearerType === "SPECIFIC_MEMBER") {
      if (!activeBearerMemberId || !selectedBearerMember) {
        toast.error("Please select the member who bears this transfer fee");
        return;
      }
      if (selectedBearerMember.financialSummary.netBalance < numericFee) {
        toast.error(
          `${selectedBearerMember.name}'s net balance (${formatTaka(selectedBearerMember.financialSummary.netBalance)}) is less than ${formatTaka(numericFee)}.`,
        );
        return;
      }
    }

    try {
      await createTransfer({
        fromAccountId: activeFromId,
        toAccountId: activeToId,
        amount: numericAmount,
        transferFee: numericFee,
        feeBearerType: hasFee ? feeBearerType : "SHARED_PRO_RATA",
        feeBearerMemberId:
          hasFee && feeBearerType === "SPECIFIC_MEMBER"
            ? activeBearerMemberId
            : undefined,
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

      {/* Progressive Disclosure: Fee Bearer Selector when transferFee > 0 */}
      {hasFee && (
        <div className="space-y-2.5 p-3.5 rounded-md border border-border bg-muted/35">
          <p className="text-xs font-semibold text-foreground">
            Who bears this {formatTaka(numericFee)} transfer fee?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFeeBearerType("SHARED_PRO_RATA")}
              className={`text-left flex items-start gap-2 p-2.5 rounded border transition-colors cursor-pointer ${
                feeBearerType === "SHARED_PRO_RATA"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              {feeBearerType === "SHARED_PRO_RATA" ? (
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-0.5" />
              )}
              <div className="text-[11px]">
                <p className="font-semibold text-foreground">
                  Group Shared (Pro-rata)
                </p>
                <p className="text-muted-foreground mt-0.5 leading-snug">
                  General fund management; split by active members&apos;
                  balances.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFeeBearerType("SPECIFIC_MEMBER")}
              className={`text-left flex items-start gap-2 p-2.5 rounded border transition-colors cursor-pointer ${
                feeBearerType === "SPECIFIC_MEMBER"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              {feeBearerType === "SPECIFIC_MEMBER" ? (
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-0.5" />
              )}
              <div className="text-[11px]">
                <p className="font-semibold text-foreground">
                  Specific Member (Payout)
                </p>
                <p className="text-muted-foreground mt-0.5 leading-snug">
                  Moving funds for a member&apos;s Return or Settle &amp; Close.
                </p>
              </div>
            </button>
          </div>

          {feeBearerType === "SHARED_PRO_RATA" && membersRes && (
            <div
              className={`text-[11px] px-2.5 py-2 rounded border ${
                isProRataInsufficient
                  ? "bg-error-5 border-error/30 text-error"
                  : "bg-card border-border text-text-description"
              }`}
            >
              {isProRataInsufficient ? (
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Active members&apos; combined balance is only{" "}
                    <strong className="font-money">
                      {formatTaka(activeTotalBalance)}
                    </strong>
                    . Former members and Donated Reserve are protected from
                    charges.
                  </span>
                </div>
              ) : (
                <span>
                  <strong className="font-money text-foreground">
                    {formatTaka(numericFee)}
                  </strong>{" "}
                  will split pro-rata across{" "}
                  <strong className="text-foreground">
                    {activeEligibleMembers.length}
                  </strong>{" "}
                  active member(s) with balance &gt; ৳0 (
                  <strong className="font-money">
                    {formatTaka(activeTotalBalance)}
                  </strong>{" "}
                  combined member balance • Donated &amp; former funds excluded).
                </span>
              )}
            </div>
          )}

          {feeBearerType === "SPECIFIC_MEMBER" && (
            <div className="space-y-2 pt-1">
              <AppSelect
                value={activeBearerMemberId}
                onChange={setFeeBearerMemberId}
                placeholder="Select member bearing fee..."
                options={specificSelectableMembers.map((m) => ({
                  value: m.id,
                  label: `${m.name}${m.status !== "ACTIVE" || m.isDeleted ? " [Former]" : ""} — Net: ${formatTaka(m.financialSummary.netBalance)}`,
                }))}
              />

              {selectedBearerMember && (
                <div
                  className={`text-[11px] px-2.5 py-2 rounded border ${
                    isSpecificInsufficient
                      ? "bg-error-5 border-error/30 text-error"
                      : "bg-card border-border text-text-description"
                  }`}
                >
                  {isSpecificInsufficient ? (
                    <span>
                      Insufficient member balance: {selectedBearerMember.name}{" "}
                      only has{" "}
                      <strong className="font-money">
                        {formatTaka(
                          selectedBearerMember.financialSummary.netBalance,
                        )}
                      </strong>
                      .
                    </span>
                  ) : (
                    <div className="space-y-1">
                      <p>
                        <strong className="text-foreground">
                          {selectedBearerMember.name}
                        </strong>
                        :{" "}
                        <span className="font-money">
                          {formatTaka(
                            selectedBearerMember.financialSummary.netBalance,
                          )}
                        </span>{" "}
                        →{" "}
                        <strong className="font-money text-primary">
                          {formatTaka(
                            Math.max(
                              0,
                              selectedBearerMember.financialSummary.netBalance -
                                numericFee,
                            ),
                          )}
                        </strong>{" "}
                        after {formatTaka(numericFee)} fee.
                      </p>
                      {selectedBearerMember.financialSummary
                        .pendingReturnsCount > 0 && (
                        <p className="text-gold-dark">
                          Note: This member has{" "}
                          {
                            selectedBearerMember.financialSummary
                              .pendingReturnsCount
                          }{" "}
                          pending return request(s); update/reject if needed to
                          match the new balance before approval.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
        disabled={Boolean(isProRataInsufficient || isSpecificInsufficient)}
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
