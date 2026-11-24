"use client";

import AppSelect from "@/components/shared/AppSelect";
import InlineLoader from "@/components/shared/InlineLoader";
import LedgerStatCard from "@/components/shared/LedgerStatCard";
import PageHeader from "@/components/shared/PageHeader";
import StatusPill from "@/components/shared/StatusPill";
import { Checkbox } from "@/components/ui/checkbox";
import { useGetMonthlyMatrixQuery } from "@/redux/api/dashboard/dashboardApi";
import { selectCurrentUser } from "@/redux/features/user/authSlice";
import { useAppSelector } from "@/redux/hooks";
import {
  exportMonthlyMatrixExcel,
  exportMonthlyMatrixPdf,
} from "@/utils/exportStatements";
import {
  formatMonthLabel,
  formatTaka,
  getCurrentYearMonth,
} from "@/utils/formatMoney";
import {
  Download,
  FileSpreadsheet,
  HandCoins,
  Pencil,
  PiggyBank,
  Plus,
  Search,
  Target,
  Wallet,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import TargetModal from "./TargetModal";

/**
 * Formats YYYY-MM compactly for table headers:
 * - Single-year mode ("2026"): "Jan", "Feb", ..., "Nov"
 * - All-years mode ("ALL"): "Nov 26"
 */
function formatCompactMonth(yearMonth: string, isSingleYear: boolean): string {
  const full = formatMonthLabel(yearMonth); // e.g. "Nov 2026"
  if (isSingleYear) return full.split(" ")[0] || full;
  const [mon, yr] = full.split(" ");
  return mon && yr ? `${mon} '${yr.slice(-2)}` : full;
}

/**
 * Member × Month Flexible Savings Register (/dashboard/monthly-sheet)
 * Full 12-month yearly ledger spreadsheet (Jan → Dec) with current-month highlight,
 * visual paid / due / pre-join / upcoming states, instant member search, and Excel/PDF export.
 */
export default function MonthlySheetPage() {
  const user = useAppSelector(selectCurrentUser);
  const canEditTarget = user?.role === "ADMIN" || user?.role === "CASHIER";

  const currentYearMonth = getCurrentYearMonth();
  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { value: "ALL", label: "All Years" },
    { value: String(currentYear + 1), label: String(currentYear + 1) },
    { value: String(currentYear), label: String(currentYear) },
    { value: String(currentYear - 1), label: String(currentYear - 1) },
    { value: String(currentYear - 2), label: String(currentYear - 2) },
  ];

  const [year, setYear] = useState<string>(String(currentYear));
  const [includeInactive, setIncludeInactive] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const [targetModal, setTargetModal] = useState<{
    open: boolean;
    month?: string;
    amount?: number;
  }>({ open: false });

  const { data: matrixRes, isLoading } = useGetMonthlyMatrixQuery({
    year: year === "ALL" ? undefined : year,
    includeInactive,
  });

  const matrix = matrixRes?.data;
  const isSingleYear = year !== "ALL";

  // Instant member filter without triggering extra API requests
  const filteredRows = useMemo(() => {
    const allRows = matrix?.rows || [];
    const q = memberSearch.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q),
    );
  }, [matrix?.rows, memberSearch]);

  const handleExportExcel = () => {
    if (!matrix || matrix.rows.length === 0) {
      toast.error("No data available to export");
      return;
    }
    exportMonthlyMatrixExcel(matrix, year);
    toast.success("Excel statement downloaded");
  };

  const handleExportPdf = () => {
    if (!matrix || matrix.rows.length === 0) {
      toast.error("No data available to export");
      return;
    }
    exportMonthlyMatrixPdf(matrix, year);
    toast.success("PDF statement downloaded");
  };

  const totalMembersCount = matrix?.rows.length || 0;
  const grandDeposited =
    matrix?.rows.reduce((sum, r) => sum + r.totalDeposited, 0) || 0;
  const grandReturned =
    matrix?.rows.reduce((sum, r) => sum + r.totalReturned, 0) || 0;
  const grandNet = matrix?.rows.reduce((sum, r) => sum + r.netBalance, 0) || 0;

  // Focus the KPI goal card on the current calendar month (or latest configured month)
  const focusMonth = useMemo(() => {
    if (!matrix || matrix.months.length === 0) return null;
    return (
      matrix.months.find((m) => m.month === currentYearMonth) ||
      [...matrix.months]
        .reverse()
        .find((m) => m.targetAmount > 0 || m.collectedAmount > 0) ||
      matrix.months[matrix.months.length - 1]
    );
  }, [matrix, currentYearMonth]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Monthly Savings Sheet"
        subtitle="Yearly member-by-month deposit register, monthly group targets, and statement export"
        actions={
          <>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center justify-center gap-1.5 h-9 min-h-9 px-3.5 rounded border border-[#b4cabe] bg-card text-foreground text-xs font-medium leading-none shadow-[0_1px_2px_rgba(7,42,31,0.05)] hover:bg-muted hover:border-[#8faea0] transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
              Excel
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center justify-center gap-1.5 h-9 min-h-9 px-3.5 rounded border border-[#b4cabe] bg-card text-foreground text-xs font-medium leading-none shadow-[0_1px_2px_rgba(7,42,31,0.05)] hover:bg-muted hover:border-[#8faea0] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              PDF
            </button>
            {canEditTarget && (
              <button
                type="button"
                onClick={() =>
                  setTargetModal({
                    open: true,
                    month: focusMonth?.month || currentYearMonth,
                    amount: focusMonth?.targetAmount || 0,
                  })
                }
                className="inline-flex items-center justify-center gap-1.5 h-9 min-h-9 px-3.5 rounded border border-primary bg-primary text-primary-foreground text-xs font-medium leading-none shadow-[0_1px_2px_rgba(7,42,31,0.08)] hover:bg-brand-dark hover:border-brand-dark transition-colors cursor-pointer"
              >
                <Target className="w-3.5 h-3.5" />
                Set Month Target
              </button>
            )}
          </>
        }
      />

      {/* Top Financial Summary Strip */}
      {!isLoading && matrix && (
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <LedgerStatCard
            label="Total Saved"
            value={formatTaka(grandDeposited)}
            icon={<PiggyBank className="w-[18px] h-[18px]" />}
            tone="steel"
            subtext={`${totalMembersCount} member${totalMembersCount === 1 ? "" : "s"} in ${isSingleYear ? year : "all years"}`}
          />

          <LedgerStatCard
            label="Total Returned"
            value={formatTaka(grandReturned)}
            icon={<HandCoins className="w-[18px] h-[18px]" />}
            tone="indigo"
            subtext="Approved payouts & settlements"
          />

          <LedgerStatCard
            label="Net Savings Balance"
            value={formatTaka(grandNet)}
            valueClassName="text-primary"
            icon={<Wallet className="w-[18px] h-[18px]" />}
            tone="emerald"
            subtext="Active verified group balance"
          />

          <LedgerStatCard
            label={
              focusMonth
                ? `${formatMonthLabel(focusMonth.month)} Goal`
                : "Monthly Goal"
            }
            value={focusMonth ? formatTaka(focusMonth.collectedAmount) : "৳ 0"}
            icon={<Target className="w-[18px] h-[18px]" />}
            tone="teal"
            badge={
              focusMonth ? (
                <span className="text-[11px] font-semibold text-primary font-money">
                  {focusMonth.progressPercent}%
                </span>
              ) : null
            }
            footer={
              focusMonth ? (
                <div className="w-full h-1.5 bg-muted rounded-xs overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(focusMonth.progressPercent, 100)}%`,
                    }}
                  />
                </div>
              ) : null
            }
            subtext={
              focusMonth ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="font-money">
                    Goal:{" "}
                    {focusMonth.targetAmount > 0
                      ? formatTaka(focusMonth.targetAmount)
                      : "Not set"}
                  </span>
                  {canEditTarget && (
                    <button
                      type="button"
                      onClick={() =>
                        setTargetModal({
                          open: true,
                          month: focusMonth.month,
                          amount: focusMonth.targetAmount,
                        })
                      }
                      className="text-primary hover:text-brand-dark font-medium cursor-pointer"
                    >
                      Edit
                    </button>
                  )}
                </div>
              ) : (
                "No monthly target configured"
              )
            }
          />
        </section>
      )}

      {/* Search, Year Filter & Clear Legend Toolbar */}
      <div className="bg-card border border-border rounded-md p-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Member Search */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Filter member..."
              className="w-full h-9 pl-8 pr-8 rounded border border-input bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
            />
            {memberSearch && (
              <button
                type="button"
                onClick={() => setMemberSearch("")}
                aria-label="Clear member filter"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Year:
            </span>
            <AppSelect
              value={year}
              onChange={setYear}
              options={yearOptions}
              size="sm"
              className="w-28 text-xs font-medium"
            />
          </div>

          <label
            htmlFor="include-inactive-toggle"
            className="inline-flex items-center gap-2 text-xs text-foreground cursor-pointer select-none"
          >
            <Checkbox
              id="include-inactive-toggle"
              checked={includeInactive}
              onCheckedChange={(checked) => setIncludeInactive(checked === true)}
            />
            <span>Include former / inactive</span>
          </label>
        </div>

        {/* Scannable Cell Legend */}
        <div className="flex flex-wrap items-center gap-3.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-100 border border-emerald-400" />
            Paid
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-money font-medium text-foreground/60">
              ৳ 0
            </span>
            Not deposited
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-semibold text-foreground/45">—</span>
            Before joined
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-bold text-foreground/40">·</span>
            Upcoming
          </span>
        </div>
      </div>

      {/* Yearly 12-Month Ledger Register Table */}
      {isLoading ? (
        <InlineLoader text="Loading monthly savings register..." />
      ) : !matrix || matrix.rows.length === 0 ? (
        <div className="bg-card border border-border rounded-md p-10 text-center space-y-2.5">
          <p className="text-sm font-medium text-foreground">
            No members found for {isSingleYear ? year : "all years"}
          </p>
          <p className="text-xs text-muted-foreground">
            Add members or record approved deposits to populate the yearly
            savings sheet.
          </p>
          <div className="pt-1">
            <Link
              href="/dashboard/deposits?action=new"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded border border-primary bg-primary text-primary-foreground text-xs font-medium hover:bg-brand-dark cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Deposit
            </Link>
          </div>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-card border border-border rounded-md p-8 text-center text-sm text-muted-foreground">
          No members match &ldquo;{memberSearch}&rdquo;.{" "}
          <button
            type="button"
            onClick={() => setMemberSearch("")}
            className="text-primary font-medium underline hover:text-brand-dark cursor-pointer"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                <tr>
                  <th className="sticky left-0 z-10 bg-muted px-4 py-3 text-left min-w-[210px] border-r border-border">
                    Member
                  </th>

                  {matrix.months.map((m) => {
                    const isCurrent = m.month === currentYearMonth;
                    return (
                      <th
                        key={m.month}
                        className={`px-2.5 py-2.5 text-right w-[104px] min-w-[96px] border-r border-border/60 whitespace-nowrap ${
                          isCurrent
                            ? "bg-emerald-50/80 border-t-2 border-t-primary"
                            : ""
                        }`}
                      >
                        <div className="flex flex-col items-end">
                          <div className="inline-flex items-center gap-1">
                            {isCurrent && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-[2px] bg-primary text-primary-foreground leading-none">
                                Now
                              </span>
                            )}
                            {canEditTarget ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setTargetModal({
                                    open: true,
                                    month: m.month,
                                    amount: m.targetAmount,
                                  })
                                }
                                className="inline-flex items-center gap-1 text-foreground hover:text-primary transition-colors cursor-pointer group"
                                title={`Edit goal for ${formatMonthLabel(m.month)}`}
                              >
                                <span>
                                  {formatCompactMonth(m.month, isSingleYear)}
                                </span>
                                <Pencil className="w-2.5 h-2.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                              </button>
                            ) : (
                              <span className="text-foreground">
                                {formatCompactMonth(m.month, isSingleYear)}
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] font-normal normal-case text-muted-foreground font-money mt-0.5">
                            {m.targetAmount > 0
                              ? formatTaka(m.targetAmount)
                              : "—"}
                          </span>

                          {m.targetAmount > 0 && (
                            <div className="w-16 h-1 bg-border/80 rounded-full overflow-hidden mt-1">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{
                                  width: `${Math.min(m.progressPercent, 100)}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}

                  <th className="px-3.5 py-3 text-right w-[122px] min-w-[114px] border-l-2 border-border border-r border-border/60 whitespace-nowrap">
                    Total Saved
                  </th>
                  <th className="px-3.5 py-3 text-right w-[110px] min-w-[100px] border-r border-border/60 whitespace-nowrap">
                    Returned
                  </th>
                  <th className="px-3.5 py-3 text-right w-[126px] min-w-[118px] bg-emerald-50/45 text-foreground whitespace-nowrap">
                    Net Balance
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {filteredRows.map((row) => {
                  const initials = row.name
                    .split(/\s+/)
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={row.id} className="hover:bg-muted/25 group">
                      <td className="sticky left-0 z-10 bg-card group-hover:bg-muted/25 px-4 py-3 border-r border-border">
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-7 h-7 rounded bg-[#e9f4ef] border border-[#cce3d8] text-[#046c4e] text-[11px] font-semibold flex items-center justify-center shrink-0 overflow-hidden">
                            {row.profileImage ? (
                              <Image
                                src={row.profileImage}
                                alt={row.name}
                                fill
                                sizes="28px"
                                className="object-cover"
                              />
                            ) : (
                              initials
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/members/${row.id}`}
                              className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer block truncate max-w-44"
                            >
                              {row.name}
                            </Link>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-medium text-muted-foreground">
                                {row.role}
                              </span>
                              {row.status !== "ACTIVE" && (
                                <StatusPill status={row.status} />
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {matrix.months.map((m) => {
                        const cell = row.monthlyBreakdown[m.month];
                        const isCurrent = m.month === currentYearMonth;
                        const isFuture = m.month > currentYearMonth;
                        const isPaid = cell !== null && cell.amount > 0;

                        return (
                          <td
                            key={m.month}
                            className={`px-2.5 py-3 text-right font-money text-xs border-r border-border/60 whitespace-nowrap ${
                              isPaid
                                ? "bg-emerald-50/55"
                                : isCurrent
                                  ? "bg-emerald-50/25"
                                  : cell === null
                                    ? "bg-muted/20"
                                    : ""
                            }`}
                          >
                            {cell === null ? (
                              <span
                                className="text-muted-foreground/40 select-none"
                                title="Before member joined"
                              >
                                —
                              </span>
                            ) : isPaid ? (
                              <div>
                                <span className="font-semibold text-emerald-900">
                                  {formatTaka(cell.amount)}
                                </span>
                                {cell.count > 1 && (
                                  <span className="block text-[10px] text-emerald-700/80 font-sans">
                                    {cell.count}×
                                  </span>
                                )}
                              </div>
                            ) : isFuture ? (
                              <span
                                className="text-muted-foreground/35 font-bold select-none"
                                title="Upcoming month"
                              >
                                ·
                              </span>
                            ) : (
                              <span className="text-muted-foreground/65">
                                ৳ 0
                              </span>
                            )}
                          </td>
                        );
                      })}

                      <td className="px-3.5 py-3 text-right font-money text-xs font-medium text-foreground border-l-2 border-border border-r border-border/60 whitespace-nowrap">
                        {formatTaka(row.totalDeposited)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-money text-xs text-muted-foreground border-r border-border/60 whitespace-nowrap">
                        {formatTaka(row.totalReturned)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-money text-xs font-semibold text-primary bg-emerald-50/25 whitespace-nowrap">
                        {formatTaka(row.netBalance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Monthly Totals & Goal % Footer */}
              <tfoot className="bg-muted/70 border-t-2 border-border font-money text-xs">
                <tr>
                  <td className="sticky left-0 z-10 bg-muted px-4 py-3 font-semibold text-foreground border-r border-border font-sans">
                    Collected Total
                    <span className="block text-[10px] font-normal text-muted-foreground">
                      Month-wise sum
                    </span>
                  </td>

                  {matrix.months.map((m) => {
                    const isCurrent = m.month === currentYearMonth;
                    const isFuture =
                      m.month > currentYearMonth &&
                      m.collectedAmount === 0 &&
                      m.targetAmount === 0;
                    return (
                      <td
                        key={m.month}
                        className={`px-2.5 py-3 text-right border-r border-border/60 whitespace-nowrap ${
                          isCurrent ? "bg-emerald-50/50" : ""
                        }`}
                      >
                        {isFuture ? (
                          <span className="text-muted-foreground/35 font-bold">
                            ·
                          </span>
                        ) : (
                          <>
                            <div className="font-semibold text-foreground">
                              {formatTaka(m.collectedAmount)}
                            </div>
                            {m.targetAmount > 0 && (
                              <div
                                className={`text-[10px] font-medium font-sans mt-0.5 ${
                                  m.progressPercent >= 100
                                    ? "text-success"
                                    : "text-primary"
                                }`}
                              >
                                {m.progressPercent}%
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    );
                  })}

                  <td className="px-3.5 py-3 text-right font-semibold text-foreground border-l-2 border-border border-r border-border/60 whitespace-nowrap">
                    {formatTaka(grandDeposited)}
                  </td>
                  <td className="px-3.5 py-3 text-right font-semibold text-muted-foreground border-r border-border/60 whitespace-nowrap">
                    {formatTaka(grandReturned)}
                  </td>
                  <td className="px-3.5 py-3 text-right font-bold text-primary bg-emerald-50/45 whitespace-nowrap">
                    {formatTaka(grandNet)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Helpful Table Footer Bar */}
          <div className="px-4 py-2.5 bg-background/60 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>
              Showing{" "}
              <strong className="text-foreground">{filteredRows.length}</strong>{" "}
              of{" "}
              <strong className="text-foreground">{totalMembersCount}</strong>{" "}
              member{totalMembersCount === 1 ? "" : "s"}
              {canEditTarget &&
                " • Click any month header (Jan–Dec) to set or update its savings goal"}
            </span>
            <Link
              href="/dashboard/deposits?action=new"
              className="inline-flex items-center gap-1 font-medium text-primary hover:text-brand-dark cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              Record Deposit
            </Link>
          </div>
        </div>
      )}

      {/* Editable Monthly Target Modal */}
      <TargetModal
        isOpen={targetModal.open}
        onClose={() => setTargetModal({ open: false })}
        initialMonth={targetModal.month}
        initialAmount={targetModal.amount}
      />
    </div>
  );
}
