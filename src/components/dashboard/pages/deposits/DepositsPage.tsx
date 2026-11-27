"use client";

import { Pagination } from "@/components/dashboard/pagination";
import { SearchBar } from "@/components/dashboard/search-bar";
import AppSelect from "@/components/shared/AppSelect";
import ConfirmModal from "@/components/shared/ConfirmModal";
import InlineLoader from "@/components/shared/InlineLoader";
import PageHeader from "@/components/shared/PageHeader";
import ProofPreviewModal, {
  ProofPreviewData,
} from "@/components/shared/ProofPreviewModal";
import StatusPill from "@/components/shared/StatusPill";
import { useGetPaymentAccountsQuery } from "@/redux/api/accounts/accountsApi";
import {
  useDeleteDepositMutation,
  useGetDepositsQuery,
  useRestoreDepositMutation,
} from "@/redux/api/deposits/depositsApi";
import { selectCurrentUser } from "@/redux/features/user/authSlice";
import { useAppSelector } from "@/redux/hooks";
import {
  PAYMENT_METHODS,
  PaymentMethodType,
  TRANSACTION_STATUSES,
  TransactionStatus,
} from "@/types/backend";
import { IDeposit } from "@/types/global";
import { formatDate } from "@/utils/formatDate";
import {
  formatMonthLabel,
  formatTaka,
  getApiErrorMessage,
  getPaymentMethodLabel,
} from "@/utils/formatMoney";
import useSetParamsForPagination from "@/utils/setParamsForPagination";
import {
  CheckSquare,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import DepositFormModal from "./DepositFormModal";
import ReviewDepositModal from "./ReviewDepositModal";

/**
 * Deposits Ledger Page (/dashboard/deposits)
 * Supports flexible deposits, proof preview modal, search, URL pagination,
 * Admin/Cashier review (with Cashier anti-self-approval), and Admin Trash/Restore.
 */
export default function DepositsPage() {
  const user = useAppSelector(selectCurrentUser);
  const isAdmin = user?.role === "ADMIN";

  const searchParams = useSearchParams();
  const setParams = useSetParamsForPagination();

  const page = Number(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const month = searchParams.get("month") || "";
  const status = (searchParams.get("status") || "") as TransactionStatus | "";
  const paymentMethod = (searchParams.get("paymentMethod") || "") as
    | PaymentMethodType
    | "";
  const paymentAccountId = searchParams.get("paymentAccountId") || "";
  const onlyDeleted = isAdmin && searchParams.get("trash") === "1";

  const { data: accountsRes } = useGetPaymentAccountsQuery({ limit: 100 });
  const { data: depositsRes, isLoading } = useGetDepositsQuery({
    page,
    limit: 12,
    search: search || undefined,
    month: month || undefined,
    status: status || undefined,
    paymentMethod: paymentMethod || undefined,
    paymentAccountId: paymentAccountId || undefined,
    onlyDeleted: onlyDeleted || undefined,
  });

  const [deleteDeposit, { isLoading: isDeleting }] = useDeleteDepositMutation();
  const [restoreDeposit, { isLoading: isRestoring }] =
    useRestoreDepositMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<IDeposit | null>(null);
  const [reviewingDeposit, setReviewingDeposit] = useState<IDeposit | null>(
    null,
  );
  const [deletingDeposit, setDeletingDeposit] = useState<IDeposit | null>(null);
  const [proofPreview, setProofPreview] = useState<ProofPreviewData | null>(
    null,
  );

  // Derive modal visibility directly from URL "?action=new" or local toggle
  const isActionNew = searchParams.get("action") === "new";
  const isFormModalOpen = formOpen || isActionNew;

  const handleCloseFormModal = () => {
    setFormOpen(false);
    setEditingDeposit(null);
    if (isActionNew) {
      setParams({ action: null });
    }
  };

  const deposits = depositsRes?.data || [];
  const meta = depositsRes?.meta;

  const handleConfirmDelete = async () => {
    if (!deletingDeposit) return;
    try {
      await deleteDeposit(deletingDeposit.id).unwrap();
      toast.success("Deposit moved to trash");
      setDeletingDeposit(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not delete deposit"));
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreDeposit(id).unwrap();
      toast.success("Deposit restored");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not restore deposit"));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Deposits"
        subtitle="Record and verify flexible group savings deposits with proof screenshots"
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
            <button
              type="button"
              onClick={() => {
                setEditingDeposit(null);
                setFormOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 h-9 min-h-9 px-3.5 rounded border border-primary bg-primary text-primary-foreground text-xs font-medium leading-none shadow-[0_1px_2px_rgba(7,42,31,0.08)] hover:bg-brand-dark hover:border-brand-dark transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Deposit
            </button>
          </>
        }
      />

      {/* Search & Filters */}
      <div className="bg-card border border-border rounded-md p-3.5 flex flex-wrap items-center gap-2.5">
        <SearchBar
          placeholder="Search TrxID or note..."
          className="flex-1 min-w-52"
        />

        <input
          type="month"
          value={month}
          onChange={(e) =>
            setParams({ month: e.target.value || null, page: 1 })
          }
          aria-label="Filter by month"
          className="h-9 px-2.5 rounded border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
        />

        <AppSelect
          value={status}
          onChange={(val) => setParams({ status: val || null, page: 1 })}
          options={[
            { value: "", label: "All Statuses" },
            ...TRANSACTION_STATUSES.map((s) => ({ value: s, label: s })),
          ]}
          className="w-36 text-xs"
        />

        <AppSelect
          value={paymentMethod}
          onChange={(val) =>
            setParams({ paymentMethod: val || null, page: 1 })
          }
          options={[
            { value: "", label: "All Methods" },
            ...PAYMENT_METHODS.map((m) => ({
              value: m,
              label: getPaymentMethodLabel(m),
            })),
          ]}
          className="w-38 text-xs"
        />

        <AppSelect
          value={paymentAccountId}
          onChange={(val) =>
            setParams({ paymentAccountId: val || null, page: 1 })
          }
          options={[
            { value: "", label: "All Accounts" },
            ...(accountsRes?.data || []).map((acc) => ({
              value: acc.id,
              label: acc.accountName,
            })),
          ]}
          className="w-42 text-xs"
        />

        {(month || status || paymentMethod || paymentAccountId || search) && (
          <button
            type="button"
            onClick={() =>
              setParams({
                month: null,
                status: null,
                paymentMethod: null,
                paymentAccountId: null,
                search: null,
                page: 1,
              })
            }
            className="h-9 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Deposits Table */}
      {isLoading ? (
        <InlineLoader text="Loading deposits..." />
      ) : deposits.length === 0 ? (
        <div className="bg-card border border-border rounded-md p-8 text-center text-sm text-muted-foreground">
          {onlyDeleted
            ? "No deleted deposits in trash."
            : "No deposits match your filters."}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3">Date & Month</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Account & TrxID</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Proof</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deposits.map((dep) => {
                  const depMemberId = dep.memberId?._id || dep.memberId?.id;
                  const isOwn = depMemberId === user?.id;

                  // Strict RBAC action flags matching backend guards
                  const canReview =
                    !onlyDeleted &&
                    dep.status === "PENDING" &&
                    (isAdmin || (user?.role === "CASHIER" && !isOwn));
                  const canEdit =
                    !onlyDeleted &&
                    (isAdmin || (isOwn && dep.status === "PENDING"));
                  const canDelete =
                    !onlyDeleted &&
                    (isAdmin || (isOwn && dep.status === "PENDING"));

                  return (
                    <tr key={dep.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs font-medium text-foreground">
                          {formatDate(dep.depositDate)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatMonthLabel(dep.month)}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        {depMemberId ? (
                          <Link
                            href={`/dashboard/members/${depMemberId}`}
                            className="font-medium text-foreground hover:text-primary cursor-pointer"
                          >
                            {dep.memberId?.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-foreground">
                            {dep.memberId?.name || "Member"}
                          </span>
                        )}
                        {dep.note && (
                          <p
                            className="text-[11px] text-muted-foreground truncate max-w-44"
                            title={dep.note}
                          >
                            {dep.note}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-foreground">
                          {dep.paymentAccountId?.accountName || "Account"}{" "}
                          <span className="text-muted-foreground font-normal">
                            ({getPaymentMethodLabel(dep.paymentMethod)})
                          </span>
                        </p>
                        <p className="text-[11px] font-mono text-muted-foreground">
                          {dep.trxId || "No TrxID"}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-right font-semibold font-money text-foreground whitespace-nowrap">
                        {formatTaka(dep.amount)}
                      </td>

                      <td className="px-4 py-3">
                        {dep.proofImage ? (
                          <button
                            type="button"
                            onClick={() =>
                              setProofPreview({
                                title: `${dep.memberId?.name || "Member"} — Deposit Proof`,
                                imageUrl: dep.proofImage!,
                                amount: dep.amount,
                                method: dep.paymentMethod,
                                trxId: dep.trxId,
                                date: dep.depositDate,
                                note: dep.note,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-xs font-medium text-primary hover:bg-muted cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <StatusPill status={dep.status} />
                        {dep.status === "REJECTED" && dep.rejectionReason && (
                          <p
                            className="text-[11px] text-error mt-0.5 max-w-36 truncate"
                            title={dep.rejectionReason}
                          >
                            {dep.rejectionReason}
                          </p>
                        )}
                        {user?.role === "CASHIER" &&
                          isOwn &&
                          dep.status === "PENDING" && (
                            <p className="text-[10px] text-gold-dark mt-0.5">
                              Awaiting Admin
                            </p>
                          )}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {onlyDeleted && isAdmin && (
                            <button
                              type="button"
                              disabled={isRestoring}
                              onClick={() => handleRestore(dep.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-xs font-medium text-primary hover:bg-muted cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restore
                            </button>
                          )}

                          {canReview && (
                            <button
                              type="button"
                              onClick={() => setReviewingDeposit(dep)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-brand-dark cursor-pointer"
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                              Review
                            </button>
                          )}

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDeposit(dep);
                                setFormOpen(true);
                              }}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                              title="Edit deposit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeletingDeposit(dep)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-error hover:bg-error-5 cursor-pointer"
                              title="Delete deposit"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPage > 1 && (
            <div className="px-4 border-t border-border">
              <Pagination
                currentPage={meta.page}
                totalPages={meta.totalPage}
                totalItems={meta.total}
                itemsPerPage={meta.limit}
              />
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <DepositFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        editingDeposit={isActionNew ? null : editingDeposit}
      />

      <ReviewDepositModal
        deposit={reviewingDeposit}
        onClose={() => setReviewingDeposit(null)}
      />

      <ProofPreviewModal
        proof={proofPreview}
        onClose={() => setProofPreview(null)}
      />

      <ConfirmModal
        open={Boolean(deletingDeposit)}
        title="Move Deposit to Trash?"
        description={
          deletingDeposit
            ? `Are you sure you want to remove ${deletingDeposit.memberId?.name}'s deposit of ${formatTaka(deletingDeposit.amount)}? An Admin can restore it later from Trash.`
            : ""
        }
        confirmText="Move to Trash"
        tone="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingDeposit(null)}
      />
    </div>
  );
}
