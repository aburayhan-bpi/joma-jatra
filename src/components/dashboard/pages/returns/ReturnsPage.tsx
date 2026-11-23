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
import {
  useDeleteReturnMutation,
  useGetReturnsQuery,
  useRestoreReturnMutation,
} from "@/redux/api/returns/returnsApi";
import { selectCurrentUser } from "@/redux/features/user/authSlice";
import { useAppSelector } from "@/redux/hooks";
import {
  RETURN_TYPES,
  ReturnType,
  TRANSACTION_STATUSES,
  TransactionStatus,
} from "@/types/backend";
import { IDepositReturn } from "@/types/global";
import { formatDate } from "@/utils/formatDate";
import {
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
import ReturnFormModal from "./ReturnFormModal";
import ReviewReturnModal from "./ReviewReturnModal";

/**
 * Returns & Settlements Ledger Page (/dashboard/returns)
 * Manages partial returns, full settlements, donated waivers, payout proofs,
 * Cashier anti-self-approval, and Admin Trash/Restore.
 */
export default function ReturnsPage() {
  const user = useAppSelector(selectCurrentUser);
  const isAdmin = user?.role === "ADMIN";

  const searchParams = useSearchParams();
  const setParams = useSetParamsForPagination();

  const page = Number(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const status = (searchParams.get("status") || "") as TransactionStatus | "";
  const returnType = (searchParams.get("returnType") || "") as ReturnType | "";
  const onlyDeleted = isAdmin && searchParams.get("trash") === "1";

  const { data: returnsRes, isLoading } = useGetReturnsQuery({
    page,
    limit: 12,
    search: search || undefined,
    status: status || undefined,
    returnType: returnType || undefined,
    onlyDeleted: onlyDeleted || undefined,
  });

  const [deleteReturn, { isLoading: isDeleting }] = useDeleteReturnMutation();
  const [restoreReturn, { isLoading: isRestoring }] =
    useRestoreReturnMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<IDepositReturn | null>(
    null,
  );
  const [reviewingReturn, setReviewingReturn] = useState<IDepositReturn | null>(
    null,
  );
  const [deletingReturn, setDeletingReturn] = useState<IDepositReturn | null>(
    null,
  );
  const [proofPreview, setProofPreview] = useState<ProofPreviewData | null>(
    null,
  );

  // Derive deep-link modal state directly from URL without useEffect
  const isActionNew = searchParams.get("action") === "new";
  const settleMemberIdParam = searchParams.get("settleMemberId") || undefined;
  const isFormModalOpen = formOpen || isActionNew || Boolean(settleMemberIdParam);

  const handleCloseFormModal = () => {
    setFormOpen(false);
    setEditingReturn(null);
    if (isActionNew || settleMemberIdParam) {
      setParams({ action: null, settleMemberId: null });
    }
  };

  const returns = returnsRes?.data || [];
  const meta = returnsRes?.meta;

  const handleConfirmDelete = async () => {
    if (!deletingReturn) return;
    try {
      await deleteReturn(deletingReturn.id).unwrap();
      toast.success("Return moved to trash");
      setDeletingReturn(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not delete return"));
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreReturn(id).unwrap();
      toast.success("Return restored");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not restore return"));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Returns & Settlements"
        subtitle="Track partial withdrawals, member exit settlements, and payout proofs"
        actions={
          <>
            {isAdmin && (
              <button
                type="button"
                onClick={() =>
                  setParams({ trash: onlyDeleted ? null : "1", page: 1 })
                }
                className={`inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded border text-xs font-medium leading-none transition-colors cursor-pointer ${
                  onlyDeleted
                    ? "bg-muted border-primary text-primary"
                    : "bg-card border-border text-foreground hover:bg-muted"
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {onlyDeleted ? "Viewing Trash" : "Trash"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setEditingReturn(null);
                setFormOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded border border-primary bg-primary text-primary-foreground text-xs font-medium leading-none hover:bg-brand-dark hover:border-brand-dark transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Request / Record Return
            </button>
          </>
        }
      />

      {/* Search & Filters */}
      <div className="bg-card border border-border rounded-md p-3.5 flex flex-wrap items-center gap-2.5">
        <SearchBar
          placeholder="Search TrxID, recipient, or reason..."
          className="flex-1 min-w-52"
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
          value={returnType}
          onChange={(val) => setParams({ returnType: val || null, page: 1 })}
          options={[
            { value: "", label: "All Return Types" },
            ...RETURN_TYPES.map((t) => ({
              value: t,
              label: t.replace(/_/g, " "),
            })),
          ]}
          className="w-44 text-xs"
        />

        {(status || returnType || search) && (
          <button
            type="button"
            onClick={() =>
              setParams({
                status: null,
                returnType: null,
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

      {/* Returns Table */}
      {isLoading ? (
        <InlineLoader text="Loading returns..." />
      ) : returns.length === 0 ? (
        <div className="bg-card border border-border rounded-md p-8 text-center text-sm text-muted-foreground">
          {onlyDeleted
            ? "No deleted returns in trash."
            : "No returns match your filters."}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3">Date & Type</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Payout & Recipient</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Proof</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {returns.map((ret) => {
                  const retMemberId = ret.memberId?._id || ret.memberId?.id;
                  const isOwn = retMemberId === user?.id;

                  const canReview =
                    !onlyDeleted &&
                    ret.status === "PENDING" &&
                    (isAdmin || (user?.role === "CASHIER" && !isOwn));
                  const canEdit =
                    !onlyDeleted &&
                    ret.status === "PENDING" &&
                    (isAdmin || isOwn);
                  const canDelete =
                    !onlyDeleted &&
                    (isAdmin || (isOwn && ret.status === "PENDING"));

                  return (
                    <tr key={ret.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs font-medium text-foreground">
                          {formatDate(ret.returnDate)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {ret.returnType.replace(/_/g, " ")}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        {retMemberId ? (
                          <Link
                            href={`/dashboard/members/${retMemberId}`}
                            className="font-medium text-foreground hover:text-primary cursor-pointer"
                          >
                            {ret.memberId?.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-foreground">
                            {ret.memberId?.name || "Member"}
                          </span>
                        )}
                        {ret.reason && (
                          <p className="text-[11px] text-muted-foreground truncate max-w-44">
                            {ret.reason}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-foreground">
                          {ret.returnType === "DONATED_WAIVER"
                            ? "Donated to Group Fund"
                            : ret.paymentAccountId
                              ? `${ret.paymentAccountId.accountName} (${getPaymentMethodLabel(ret.paymentMethod)})`
                              : "Payout account pending"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-48">
                          {ret.recipientAccount
                            ? `To: ${ret.recipientAccount}`
                            : ret.trxId
                              ? `TrxID: ${ret.trxId}`
                              : "—"}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-right font-semibold font-money text-secondary whitespace-nowrap">
                        {formatTaka(ret.amount)}
                      </td>

                      <td className="px-4 py-3">
                        {ret.proofImage ? (
                          <button
                            type="button"
                            onClick={() =>
                              setProofPreview({
                                title: `${ret.memberId?.name || "Member"} — Return Proof`,
                                imageUrl: ret.proofImage!,
                                amount: ret.amount,
                                method: ret.paymentMethod,
                                trxId: ret.trxId,
                                date: ret.returnDate,
                                note: ret.reason,
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
                        <StatusPill status={ret.status} />
                        {ret.status === "REJECTED" && ret.rejectionReason && (
                          <p
                            className="text-[11px] text-error mt-0.5 max-w-36 truncate"
                            title={ret.rejectionReason}
                          >
                            {ret.rejectionReason}
                          </p>
                        )}
                        {user?.role === "CASHIER" &&
                          isOwn &&
                          ret.status === "PENDING" && (
                            <p className="text-[10px] text-secondary mt-0.5">
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
                              onClick={() => handleRestore(ret.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-xs font-medium text-primary hover:bg-muted cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restore
                            </button>
                          )}

                          {canReview && (
                            <button
                              type="button"
                              onClick={() => setReviewingReturn(ret)}
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
                                setEditingReturn(ret);
                                setFormOpen(true);
                              }}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                              title="Edit return request"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeletingReturn(ret)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-error hover:bg-error-5 cursor-pointer"
                              title="Delete return"
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
      <ReturnFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        editingReturn={isActionNew || settleMemberIdParam ? null : editingReturn}
        defaultMemberId={settleMemberIdParam}
      />

      <ReviewReturnModal
        returnEntry={reviewingReturn}
        onClose={() => setReviewingReturn(null)}
      />

      <ProofPreviewModal
        proof={proofPreview}
        onClose={() => setProofPreview(null)}
      />

      <ConfirmModal
        open={Boolean(deletingReturn)}
        title="Move Return to Trash?"
        description={
          deletingReturn
            ? `Are you sure you want to remove ${deletingReturn.memberId?.name}'s return of ${formatTaka(deletingReturn.amount)}? An Admin can restore it later.`
            : ""
        }
        confirmText="Move to Trash"
        tone="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingReturn(null)}
      />
    </div>
  );
}
