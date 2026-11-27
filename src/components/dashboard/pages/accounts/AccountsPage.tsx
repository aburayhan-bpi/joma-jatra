"use client";

import { Pagination } from "@/components/dashboard/pagination";
import { SearchBar } from "@/components/dashboard/search-bar";
import ConfirmModal from "@/components/shared/ConfirmModal";
import InlineLoader from "@/components/shared/InlineLoader";
import PageHeader from "@/components/shared/PageHeader";
import ProofPreviewModal, {
  ProofPreviewData,
} from "@/components/shared/ProofPreviewModal";
import StatusPill from "@/components/shared/StatusPill";
import {
  useDeleteChargeMutation,
  useDeletePaymentAccountMutation,
  useDeleteTransferMutation,
  useGetChargesQuery,
  useGetPaymentAccountsQuery,
  useGetTransfersQuery,
  useRestoreChargeMutation,
  useRestorePaymentAccountMutation,
  useRestoreTransferMutation,
} from "@/redux/api/accounts/accountsApi";
import { selectCurrentUser } from "@/redux/features/user/authSlice";
import { useAppSelector } from "@/redux/hooks";
import { IPaymentAccount } from "@/types/global";
import { formatDate } from "@/utils/formatDate";
import {
  formatTaka,
  getApiErrorMessage,
  getPaymentMethodLabel,
} from "@/utils/formatMoney";
import useSetParamsForPagination from "@/utils/setParamsForPagination";
import {
  ArrowLeftRight,
  Check,
  Copy,
  Eye,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import AccountBreakdownModal from "./AccountBreakdownModal";
import ChargeModal from "./ChargeModal";
import PaymentAccountModal from "./PaymentAccountModal";
import TransferModal from "./TransferModal";

type AccountsTab = "accounts" | "transfers" | "charges";

/**
 * Payment Accounts, Internal Transfers & Account Charges Hub (/dashboard/accounts)
 * - Everyone can inspect live account balances and 1-click copy numbers.
 * - Admin & Cashier can manage accounts, record transfers, and log charges.
 * - Admin can view Trash and restore deleted items.
 */
export default function AccountsPage() {
  const user = useAppSelector(selectCurrentUser);
  const isAdmin = user?.role === "ADMIN";
  const isManager = isAdmin || user?.role === "CASHIER";

  const searchParams = useSearchParams();
  const setParams = useSetParamsForPagination();

  const rawTab = searchParams.get("tab");
  const tab: AccountsTab =
    rawTab === "transfers" || rawTab === "charges" ? rawTab : "accounts";
  const page = Number(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const onlyDeleted = isAdmin && searchParams.get("trash") === "1";

  const { data: accountsRes, isLoading: isAccountsLoading } =
    useGetPaymentAccountsQuery(
      { page, limit: 12, search: search || undefined, onlyDeleted: onlyDeleted || undefined },
      { skip: tab !== "accounts" },
    );

  const { data: transfersRes, isLoading: isTransfersLoading } =
    useGetTransfersQuery(
      { page, limit: 12, search: search || undefined, onlyDeleted: onlyDeleted || undefined },
      { skip: tab !== "transfers" },
    );

  const { data: chargesRes, isLoading: isChargesLoading } = useGetChargesQuery(
    { page, limit: 12, search: search || undefined, onlyDeleted: onlyDeleted || undefined },
    { skip: tab !== "charges" },
  );

  const [deleteAccount, { isLoading: isDeletingAccount }] =
    useDeletePaymentAccountMutation();
  const [restoreAccount, { isLoading: isRestoringAccount }] =
    useRestorePaymentAccountMutation();

  const [deleteTransfer, { isLoading: isDeletingTransfer }] =
    useDeleteTransferMutation();
  const [restoreTransfer, { isLoading: isRestoringTransfer }] =
    useRestoreTransferMutation();

  const [deleteCharge, { isLoading: isDeletingCharge }] =
    useDeleteChargeMutation();
  const [restoreCharge, { isLoading: isRestoringCharge }] =
    useRestoreChargeMutation();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<IPaymentAccount | null>(
    null,
  );
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [breakdownAccountId, setBreakdownAccountId] = useState<string | null>(
    null,
  );
  const [proofPreview, setProofPreview] = useState<ProofPreviewData | null>(
    null,
  );

  // Unified soft-delete confirmation state across all 3 tabs
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: AccountsTab;
    id: string;
    label: string;
  } | null>(null);

  const handleCopy = async (id: string, number: string) => {
    try {
      await navigator.clipboard.writeText(number);
      setCopiedId(id);
      toast.success("Account number copied");
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === "accounts") {
        await deleteAccount(deleteTarget.id).unwrap();
      } else if (deleteTarget.kind === "transfers") {
        await deleteTransfer(deleteTarget.id).unwrap();
      } else {
        await deleteCharge(deleteTarget.id).unwrap();
      }
      toast.success("Moved to trash");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not delete item"));
    }
  };

  const handleRestore = async (kind: AccountsTab, id: string) => {
    try {
      if (kind === "accounts") await restoreAccount(id).unwrap();
      else if (kind === "transfers") await restoreTransfer(id).unwrap();
      else await restoreCharge(id).unwrap();
      toast.success("Item restored");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not restore item"));
    }
  };

  const accounts = accountsRes?.data || [];
  const transfers = transfersRes?.data || [];
  const charges = chargesRes?.data || [];

  const activeMeta =
    tab === "accounts"
      ? accountsRes?.meta
      : tab === "transfers"
        ? transfersRes?.meta
        : chargesRes?.meta;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Accounts, Transfers & Charges"
        subtitle="Manage Cash, bKash, Nagad, Rocket, Upay, CellFin, and Bank accounts with full reconciliation"
        actions={
          <>
            {isAdmin && (
              <button
                type="button"
                onClick={() =>
                  setParams({ trash: onlyDeleted ? null : "1", page: 1 })
                }
                className={`inline-flex items-center justify-center gap-1.5 h-9 min-h-9 px-3.5 rounded border text-xs font-medium leading-none shadow-[0_1px_2px_rgba(7,42,31,0.05)] transition-colors cursor-pointer ${
                  onlyDeleted
                    ? "bg-muted border-primary text-primary"
                    : "bg-card border-[#b4cabe] text-foreground hover:bg-muted hover:border-[#8faea0]"
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {onlyDeleted ? "Viewing Trash" : "Trash"}
              </button>
            )}

            {isManager && tab === "accounts" && (
              <button
                type="button"
                onClick={() => {
                  setEditingAccount(null);
                  setAccountModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 h-9 min-h-9 px-3.5 rounded border border-primary bg-primary text-primary-foreground text-xs font-medium leading-none shadow-[0_1px_2px_rgba(7,42,31,0.08)] hover:bg-brand-dark hover:border-brand-dark cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Account
              </button>
            )}

            {isManager && tab === "transfers" && (
              <button
                type="button"
                onClick={() => setTransferModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 h-9 min-h-9 px-3.5 rounded border border-primary bg-primary text-primary-foreground text-xs font-medium leading-none shadow-[0_1px_2px_rgba(7,42,31,0.08)] hover:bg-brand-dark hover:border-brand-dark cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Record Transfer
              </button>
            )}

            {isManager && tab === "charges" && (
              <button
                type="button"
                onClick={() => setChargeModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 h-9 min-h-9 px-3.5 rounded border border-primary bg-primary text-primary-foreground text-xs font-medium leading-none shadow-[0_1px_2px_rgba(7,42,31,0.08)] hover:bg-brand-dark hover:border-brand-dark cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                Record Charge
              </button>
            )}
          </>
        }
      />

      {/* Tab Bar + Search */}
      <div className="bg-card border border-border rounded-md p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center p-1 rounded bg-muted border border-border">
          {(
            [
              { key: "accounts", label: "Payment Accounts" },
              { key: "transfers", label: "Internal Transfers" },
              { key: "charges", label: "Account Charges" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                setParams({
                  tab: item.key === "accounts" ? null : item.key,
                  search: null,
                  page: 1,
                })
              }
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                tab === item.key
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <SearchBar
          placeholder={
            tab === "accounts"
              ? "Search account name or number..."
              : tab === "transfers"
                ? "Search TrxID or note..."
                : "Search charge title or note..."
          }
          className="flex-1 max-w-xs min-w-52"
        />
      </div>

      {/* TAB 1: PAYMENT ACCOUNTS */}
      {tab === "accounts" &&
        (isAccountsLoading ? (
          <InlineLoader text="Loading payment accounts..." />
        ) : accounts.length === 0 ? (
          <div className="bg-card border border-border rounded-md p-8 text-center text-sm text-muted-foreground">
            {onlyDeleted
              ? "No deleted accounts in trash."
              : "No payment accounts added yet."}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3">Method &amp; Type</th>
                    <th className="px-4 py-3">Account Number</th>
                    <th className="px-4 py-3 text-right">Live Balance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {acc.accountName}
                        </p>
                        {(acc.bankName || acc.note) && (
                          <p className="text-[11px] text-muted-foreground">
                            {acc.bankName
                              ? `${acc.bankName}${acc.branchName ? ` • ${acc.branchName}` : ""}`
                              : acc.note}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs">
                        <span className="font-medium text-foreground">
                          {getPaymentMethodLabel(acc.method)}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          • {acc.accountType}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-1.5 font-mono text-xs text-foreground">
                          <span>{acc.accountNumber}</span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(acc.id, acc.accountNumber)
                            }
                            className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted cursor-pointer"
                            title="Copy account number"
                          >
                            {copiedId === acc.id ? (
                              <Check className="w-3.5 h-3.5 text-success" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right font-semibold font-money text-primary whitespace-nowrap">
                        {formatTaka(acc.balance)}
                      </td>

                      <td className="px-4 py-3">
                        <StatusPill
                          status={acc.isActive ? "ACTIVE" : "INACTIVE"}
                        />
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {!onlyDeleted && (
                            <button
                              type="button"
                              onClick={() => setBreakdownAccountId(acc.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-xs font-medium text-foreground hover:bg-muted cursor-pointer"
                              title="View live balance breakdown"
                            >
                              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                              Breakdown
                            </button>
                          )}
                          {onlyDeleted && isAdmin && (
                            <button
                              type="button"
                              disabled={isRestoringAccount}
                              onClick={() => handleRestore("accounts", acc.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-border text-xs font-medium text-primary hover:bg-muted disabled:opacity-50 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restore
                            </button>
                          )}
                          {!onlyDeleted && isManager && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAccount(acc);
                                setAccountModalOpen(true);
                              }}
                              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                              title="Edit account"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!onlyDeleted && isAdmin && (
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  kind: "accounts",
                                  id: acc.id,
                                  label: acc.accountName,
                                })
                              }
                              className="p-1.5 rounded text-muted-foreground hover:text-error hover:bg-error-5 cursor-pointer"
                              title="Delete account (requires zero balance)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      {/* TAB 2: INTERNAL TRANSFERS */}
      {tab === "transfers" &&
        (isTransfersLoading ? (
          <InlineLoader text="Loading internal transfers..." />
        ) : transfers.length === 0 ? (
          <div className="bg-card border border-border rounded-md p-8 text-center text-sm text-muted-foreground">
            {onlyDeleted
              ? "No deleted transfers in trash."
              : "No internal transfers recorded yet."}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3">TrxID &amp; Note</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Fee</th>
                    <th className="px-4 py-3">Proof</th>
                    {isAdmin && <th className="px-4 py-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transfers.map((trf) => (
                    <tr key={trf.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(trf.transferDate)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="font-medium text-foreground">
                          {trf.fromAccountId?.accountName}
                        </span>
                        <span className="text-muted-foreground mx-1.5">→</span>
                        <span className="font-medium text-primary">
                          {trf.toAccountId?.accountName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <p className="font-mono text-foreground">
                          {trf.trxId || "—"}
                        </p>
                        {trf.note && (
                          <p
                            className="text-[11px] truncate max-w-52"
                            title={trf.note}
                          >
                            {trf.note}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold font-money text-foreground whitespace-nowrap">
                        {formatTaka(trf.amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-money text-gold-dark whitespace-nowrap">
                        {trf.transferFee > 0 ? formatTaka(trf.transferFee) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {trf.proofImage ? (
                          <button
                            type="button"
                            onClick={() =>
                              setProofPreview({
                                title: "Internal Transfer Proof",
                                imageUrl: trf.proofImage!,
                                amount: trf.amount,
                                trxId: trf.trxId,
                                date: trf.transferDate,
                                note: trf.note,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-xs font-medium text-primary hover:bg-muted cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          {onlyDeleted ? (
                            <button
                              type="button"
                              disabled={isRestoringTransfer}
                              onClick={() => handleRestore("transfers", trf.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-xs font-medium text-primary hover:bg-muted disabled:opacity-50 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restore
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  kind: "transfers",
                                  id: trf.id,
                                  label: `transfer of ${formatTaka(trf.amount)}`,
                                })
                              }
                              className="p-1.5 rounded-md text-muted-foreground hover:text-error hover:bg-error-5 cursor-pointer"
                              title="Delete transfer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      {/* TAB 3: ACCOUNT CHARGES */}
      {tab === "charges" &&
        (isChargesLoading ? (
          <InlineLoader text="Loading account charges..." />
        ) : charges.length === 0 ? (
          <div className="bg-card border border-border rounded-md p-8 text-center text-sm text-muted-foreground">
            {onlyDeleted
              ? "No deleted charges in trash."
              : "No standalone account charges recorded yet."}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3">Title &amp; Note</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Proof</th>
                    {isAdmin && <th className="px-4 py-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {charges.map((chg) => (
                    <tr key={chg.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(chg.chargeDate)}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-foreground">
                        {chg.paymentAccountId?.accountName}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="font-medium text-foreground">
                          {chg.title}
                        </p>
                        {chg.note && (
                          <p className="text-[11px] text-muted-foreground">
                            {chg.note}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold font-money text-gold-dark whitespace-nowrap">
                        {formatTaka(chg.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {chg.proofImage ? (
                          <button
                            type="button"
                            onClick={() =>
                              setProofPreview({
                                title: chg.title,
                                imageUrl: chg.proofImage!,
                                amount: chg.amount,
                                date: chg.chargeDate,
                                note: chg.note,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-xs font-medium text-primary hover:bg-muted cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          {onlyDeleted ? (
                            <button
                              type="button"
                              disabled={isRestoringCharge}
                              onClick={() => handleRestore("charges", chg.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-xs font-medium text-primary hover:bg-muted disabled:opacity-50 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restore
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  kind: "charges",
                                  id: chg.id,
                                  label: chg.title,
                                })
                              }
                              className="p-1.5 rounded-md text-muted-foreground hover:text-error hover:bg-error-5 cursor-pointer"
                              title="Delete charge"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      {/* Shared Pagination */}
      {activeMeta && activeMeta.totalPage > 1 && (
        <div className="bg-card border border-border rounded-md px-4">
          <Pagination
            currentPage={activeMeta.page}
            totalPages={activeMeta.totalPage}
            totalItems={activeMeta.total}
            itemsPerPage={activeMeta.limit}
          />
        </div>
      )}

      {/* Modals */}
      <PaymentAccountModal
        isOpen={accountModalOpen}
        onClose={() => {
          setAccountModalOpen(false);
          setEditingAccount(null);
        }}
        editingAccount={editingAccount}
      />

      <TransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
      />

      <ChargeModal
        isOpen={chargeModalOpen}
        onClose={() => setChargeModalOpen(false)}
      />

      <AccountBreakdownModal
        accountId={breakdownAccountId}
        onClose={() => setBreakdownAccountId(null)}
      />

      <ProofPreviewModal
        proof={proofPreview}
        onClose={() => setProofPreview(null)}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Move to Trash?"
        description={
          deleteTarget
            ? `Are you sure you want to remove "${deleteTarget.label}"? An Admin can restore it later from Trash.`
            : ""
        }
        confirmText="Move to Trash"
        tone="danger"
        loading={isDeletingAccount || isDeletingTransfer || isDeletingCharge}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
