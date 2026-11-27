"use client";

import { Pagination } from "@/components/dashboard/pagination";
import { SearchBar } from "@/components/dashboard/search-bar";
import AppSelect from "@/components/shared/AppSelect";
import BackButton from "@/components/shared/BackButton";
import InlineLoader from "@/components/shared/InlineLoader";
import LedgerStatCard from "@/components/shared/LedgerStatCard";
import ProofPreviewModal, {
  ProofPreviewData,
} from "@/components/shared/ProofPreviewModal";
import StatusPill from "@/components/shared/StatusPill";
import {
  useGetMemberAuditTrailQuery,
  useGetMemberByIdQuery,
  useLazyGetMemberAuditTrailQuery,
} from "@/redux/api/members/membersApi";
import { selectCurrentUser } from "@/redux/features/user/authSlice";
import { useAppSelector } from "@/redux/hooks";
import { TRANSACTION_STATUSES } from "@/types/backend";
import {
  exportMemberAuditExcel,
  exportMemberAuditPdf,
} from "@/utils/exportStatements";
import { formatDate, formatDateTime } from "@/utils/formatDate";
import {
  formatMonthLabel,
  formatTaka,
  getPaymentMethodLabel,
} from "@/utils/formatMoney";
import useSetParamsForPagination from "@/utils/setParamsForPagination";
import {
  Download,
  Eye,
  FileSpreadsheet,
  HandCoins,
  HeartHandshake,
  PiggyBank,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Formats a `changes: { before, after }` object into concise readable diffs.
 */
function formatChangeLines(changes?: {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
} | null): string[] {
  if (!changes) return [];
  const before = changes.before || {};
  const after = changes.after || {};
  const keys = Array.from(
    new Set([...Object.keys(before), ...Object.keys(after)]),
  );

  return keys
    .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .map(
      (k) =>
        `${k}: ${String(before[k] ?? "—")} → ${String(after[k] ?? "—")}`,
    );
}

/**
 * Individual Member Details & Complete Audit Trail Page (/dashboard/members/[id])
 * Displays personal financial breakdown, exportable statements (Excel/PDF),
 * and full chronological audit trail (Deposits, Returns, Edits, Deletes, Restores).
 */
export default function MemberDetailsPage({ memberId }: { memberId: string }) {
  const user = useAppSelector(selectCurrentUser);
  const isManager = user?.role === "ADMIN" || user?.role === "CASHIER";

  const searchParams = useSearchParams();
  const setParams = useSetParamsForPagination();

  const page = Number(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const category = (searchParams.get("category") || "") as
    | "DEPOSIT"
    | "RETURN"
    | "LIFECYCLE"
    | "";
  const status = searchParams.get("status") || "";
  const month = searchParams.get("month") || "";

  const { data: memberRes, isLoading: isMemberLoading } =
    useGetMemberByIdQuery(memberId);

  const { data: auditRes, isLoading: isAuditLoading } =
    useGetMemberAuditTrailQuery({
      id: memberId,
      page,
      limit: 15,
      search: search || undefined,
      category: category || undefined,
      status: status || undefined,
      month: month || undefined,
    });

  const [fetchAllAuditTrail, { isFetching: isExporting }] =
    useLazyGetMemberAuditTrailQuery();

  const [proofPreview, setProofPreview] = useState<ProofPreviewData | null>(
    null,
  );

  if (isMemberLoading) {
    return <InlineLoader text="Loading member statement..." />;
  }

  const member = memberRes?.data;
  if (!member) {
    return (
      <div className="space-y-4">
        <BackButton href="/dashboard/members" label="Back to Members" />
        <div className="bg-card border border-border rounded-md p-6 text-sm text-muted-foreground">
          Member not found.
        </div>
      </div>
    );
  }

  const entries = auditRes?.data || [];
  const meta = auditRes?.meta;

  // Fetch complete filtered audit trail before downloading Excel/PDF statement
  const handleExport = async (format: "excel" | "pdf") => {
    try {
      const res = await fetchAllAuditTrail({
        id: memberId,
        page: 1,
        limit: 1000,
        search: search || undefined,
        category: category || undefined,
        status: status || undefined,
        month: month || undefined,
      }).unwrap();

      const fullEntries = res.data || entries;
      if (format === "excel") {
        exportMemberAuditExcel(member, fullEntries);
        toast.success("Complete member Excel statement downloaded");
      } else {
        exportMemberAuditPdf(member, fullEntries);
        toast.success("Complete member PDF statement downloaded");
      }
    } catch {
      toast.error("Could not export member statement");
    }
  };

  return (
    <div className="space-y-5">
      <BackButton href="/dashboard/members" label="Back to Members" />

      {/* Profile Header & Export Actions */}
      <div className="bg-card border border-border rounded-md p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="relative w-12 h-12 rounded bg-[#e9f4ef] border border-[#cce3d8] text-[#046c4e] flex items-center justify-center text-sm font-semibold shrink-0 overflow-hidden">
            {member.profileImage ? (
              <Image
                src={member.profileImage}
                alt={member.name}
                fill
                sizes="48px"
                className="object-cover"
              />
            ) : (
              member.name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">
                {member.name}
              </h1>
              <StatusPill status={member.role} />
              <StatusPill status={member.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {member.email}
              {member.phone ? ` • ${member.phone}` : ""} • Joined{" "}
              {formatDate(member.joinedAt)}
            </p>
            {member.leftAt && (
              <p className="text-xs text-gold-dark mt-1">
                Closed on {formatDate(member.leftAt)}
                {member.leaveNote ? ` — ${member.leaveNote}` : ""}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isManager && member.unsettledPayable > 0 && (
            <Link
              href={`/dashboard/returns?settleMemberId=${member.id}`}
              className="inline-flex items-center justify-center h-9 min-h-9 px-3.5 rounded border border-gold-dark bg-gold-dark text-white text-xs font-medium leading-none shadow-[0_1px_2px_rgba(7,42,31,0.08)] hover:opacity-90 cursor-pointer"
            >
              Settle {formatTaka(member.unsettledPayable)}
            </Link>
          )}
          <button
            type="button"
            disabled={isExporting}
            onClick={() => handleExport("excel")}
            className="inline-flex items-center justify-center gap-1.5 h-9 min-h-9 px-3.5 rounded border border-[#b4cabe] bg-card text-foreground text-xs font-medium leading-none shadow-[0_1px_2px_rgba(7,42,31,0.05)] hover:bg-muted hover:border-[#8faea0] cursor-pointer disabled:opacity-60"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
            Excel
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={() => handleExport("pdf")}
            className="inline-flex items-center justify-center gap-1.5 h-9 min-h-9 px-3.5 rounded border border-[#b4cabe] bg-card text-foreground text-xs font-medium leading-none shadow-[0_1px_2px_rgba(7,42,31,0.05)] hover:bg-muted hover:border-[#8faea0] cursor-pointer disabled:opacity-60"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            PDF
          </button>
        </div>
      </div>

      {/* Financial Summary Strip (Eye-Cold Stat Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <LedgerStatCard
          label="Total Deposited"
          value={formatTaka(member.financialSummary.totalDeposited)}
          icon={<PiggyBank className="w-[18px] h-[18px]" />}
          tone="steel"
        />
        <LedgerStatCard
          label="Total Returned"
          value={formatTaka(member.financialSummary.totalReturned)}
          icon={<HandCoins className="w-[18px] h-[18px]" />}
          tone="indigo"
        />
        <LedgerStatCard
          label="Donated / Waived"
          value={formatTaka(member.financialSummary.totalDonatedWaived)}
          icon={<HeartHandshake className="w-[18px] h-[18px]" />}
          tone="teal"
        />
        <LedgerStatCard
          label="Net Balance"
          value={formatTaka(member.financialSummary.netBalance)}
          valueClassName="text-primary"
          icon={<Wallet className="w-[18px] h-[18px]" />}
          tone="emerald"
          subtext={
            member.financialSummary.pendingDepositsCount > 0 ||
            member.financialSummary.pendingReturnsCount > 0 ? (
              <span className="text-gold-dark">
                {member.financialSummary.pendingDepositsCount} pending
                deposit(s), {member.financialSummary.pendingReturnsCount}{" "}
                return(s)
              </span>
            ) : undefined
          }
        />
      </div>

      {/* Audit Trail Filter Bar */}
      <div className="bg-card border border-border rounded-md p-3.5 flex flex-wrap items-center gap-2.5">
        <SearchBar
          placeholder="Search summary, TrxID, or note..."
          className="flex-1 min-w-52"
        />

        <AppSelect
          value={category}
          onChange={(val) => setParams({ category: val || null, page: 1 })}
          options={[
            { value: "", label: "All Categories" },
            { value: "DEPOSIT", label: "Deposits" },
            { value: "RETURN", label: "Returns" },
            { value: "LIFECYCLE", label: "Edits & Lifecycle" },
          ]}
          className="w-44 text-xs"
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

        <input
          type="month"
          value={month}
          onChange={(e) =>
            setParams({ month: e.target.value || null, page: 1 })
          }
          aria-label="Filter audit trail by month"
          className="h-9 px-2.5 rounded border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
        />

        {(category || status || month || search) && (
          <button
            type="button"
            onClick={() =>
              setParams({
                category: null,
                status: null,
                month: null,
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

      {/* Member Audit Trail Table */}
      {isAuditLoading ? (
        <InlineLoader text="Loading audit trail..." />
      ) : entries.length === 0 ? (
        <div className="bg-card border border-border rounded-md p-8 text-center text-sm text-muted-foreground">
          No audit trail events recorded yet.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Details &amp; Changes</th>
                  <th className="px-4 py-3">Method / TrxID</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status &amp; Actor</th>
                  <th className="px-4 py-3 text-right">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => {
                  const changeLines = formatChangeLines(entry.changes);
                  return (
                    <tr key={entry.id} className="hover:bg-muted/30 align-top">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs font-medium text-foreground">
                          {formatDateTime(entry.date)}
                        </p>
                        {entry.month && (
                          <p className="text-[11px] text-muted-foreground">
                            {formatMonthLabel(entry.month)}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <StatusPill
                          status={entry.eventCategory}
                          label={entry.eventCategory}
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {entry.action}
                        </p>
                      </td>

                      <td className="px-4 py-3 max-w-sm">
                        <p className="text-xs font-medium text-foreground">
                          {entry.summary}
                        </p>
                        {entry.note && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Note: {entry.note}
                          </p>
                        )}
                        {changeLines.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5 text-[11px] font-mono bg-muted/60 border border-border rounded px-2 py-1 text-text-description">
                            {changeLines.map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {entry.paymentMethod ? (
                          <>
                            <p className="text-foreground font-medium">
                              {entry.paymentAccountName ||
                                getPaymentMethodLabel(entry.paymentMethod)}
                            </p>
                            <p className="text-[11px] font-mono">
                              {entry.trxId ||
                                getPaymentMethodLabel(entry.paymentMethod)}
                            </p>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold font-money whitespace-nowrap">
                        {entry.amount === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : entry.direction === "NEUTRAL" ? (
                          <span className="text-muted-foreground">
                            {formatTaka(entry.amount)}
                          </span>
                        ) : (
                          <div>
                            <span
                              className={
                                entry.direction === "DEBIT"
                                  ? "text-gold-dark"
                                  : "text-primary"
                              }
                            >
                              {entry.direction === "DEBIT" ? "-" : "+"}
                              {formatTaka(entry.amount)}
                            </span>
                            {(entry.payoutFee || 0) > 0 && (
                              <span className="block text-[10px] font-normal text-muted-foreground">
                                Net{" "}
                                {formatTaka(
                                  Math.max(0, entry.amount - (entry.payoutFee || 0)),
                                )}{" "}
                                · Fee {formatTaka(entry.payoutFee || 0)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs">
                        {entry.status && <StatusPill status={entry.status} />}
                        {entry.performedBy && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {entry.eventCategory === "LIFECYCLE"
                              ? `By ${entry.performedBy.name}`
                              : entry.entrySource === "MEMBER_REQUEST"
                                ? `Requested: ${entry.performedBy.name}`
                                : `Recorded: ${entry.performedBy.name}`}
                          </p>
                        )}
                        {entry.reviewedBy && (
                          <p className="text-[11px] text-muted-foreground">
                            {entry.status === "APPROVED"
                              ? `Approved: ${entry.reviewedBy.name}`
                              : entry.status === "REJECTED"
                                ? `Rejected: ${entry.reviewedBy.name}`
                                : `Reviewed: ${entry.reviewedBy.name}`}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {entry.proofImage ? (
                          <button
                            type="button"
                            onClick={() =>
                              setProofPreview({
                                title: `${member.name} — ${entry.eventCategory} Proof`,
                                imageUrl: entry.proofImage!,
                                amount: entry.amount,
                                payoutFee: entry.payoutFee,
                                method: entry.paymentMethod,
                                trxId: entry.trxId,
                                date: entry.date,
                                note: entry.note,
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

      <ProofPreviewModal
        proof={proofPreview}
        onClose={() => setProofPreview(null)}
      />
    </div>
  );
}
