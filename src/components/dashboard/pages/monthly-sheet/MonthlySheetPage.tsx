"use client";

import AppSelect from "@/components/shared/AppSelect";
import InlineLoader from "@/components/shared/InlineLoader";
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
import { formatMonthLabel, formatTaka } from "@/utils/formatMoney";
import { Download, FileSpreadsheet, Target } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import TargetModal from "./TargetModal";

/**
 * Member × Month Flexible Savings Matrix (/dashboard/monthly-sheet)
 * Clean ledger spreadsheet with Radix Select year filter, Radix Checkbox toggle,
 * editable monthly targets, pre-join dash ("—") indicator, and Excel/PDF export.
 */
export default function MonthlySheetPage() {
  const user = useAppSelector(selectCurrentUser);
  const canEditTarget = user?.role === "ADMIN" || user?.role === "CASHIER";

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

  const grandDeposited =
    matrix?.rows.reduce((sum, r) => sum + r.totalDeposited, 0) || 0;
  const grandReturned =
    matrix?.rows.reduce((sum, r) => sum + r.totalReturned, 0) || 0;
  const grandNet = matrix?.rows.reduce((sum, r) => sum + r.netBalance, 0) || 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Monthly Savings Sheet"
        subtitle="Member-by-month verified deposits, flexible group targets, and statement export"
        actions={
          <>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded border border-border bg-card text-foreground text-xs font-medium leading-none hover:bg-muted transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
              Excel
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded border border-border bg-card text-foreground text-xs font-medium leading-none hover:bg-muted transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              PDF
            </button>
            {canEditTarget && (
              <button
                type="button"
                onClick={() => setTargetModal({ open: true })}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded border border-primary bg-primary text-primary-foreground text-xs font-medium leading-none hover:bg-brand-dark hover:border-brand-dark transition-colors cursor-pointer"
              >
                <Target className="w-3.5 h-3.5" />
                Set Month Target
              </button>
            )}
          </>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border rounded-md p-3.5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Year:
            </span>
            <AppSelect
              value={year}
              onChange={setYear}
              options={yearOptions}
              size="sm"
              className="w-32 text-xs font-medium"
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
            <span>Include former / inactive members</span>
          </label>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Cells marked <span className="font-semibold text-foreground">—</span>{" "}
          indicate months before the member joined.
        </p>
      </div>

      {/* Ledger Matrix Table */}
      {isLoading ? (
        <InlineLoader text="Loading monthly savings matrix..." />
      ) : !matrix || matrix.rows.length === 0 ? (
        <div className="bg-card border border-border rounded-md p-8 text-center text-sm text-muted-foreground">
          No savings data found for the selected filter.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                <tr>
                  <th className="sticky left-0 z-10 bg-muted px-4 py-3 text-left min-w-45 border-r border-border">
                    Member
                  </th>
                  {matrix.months.map((m) => (
                    <th
                      key={m.month}
                      className="px-3 py-3 text-right min-w-28 whitespace-nowrap"
                    >
                      <div className="flex flex-col items-end">
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
                            className="hover:text-primary transition-colors cursor-pointer"
                            title="Click to edit month target"
                          >
                            {formatMonthLabel(m.month)}
                          </button>
                        ) : (
                          <span>{formatMonthLabel(m.month)}</span>
                        )}
                        <span className="text-[10px] font-normal normal-case text-muted-foreground font-money mt-0.5">
                          {m.targetAmount > 0
                            ? `Goal ${formatTaka(m.targetAmount)}`
                            : "No target"}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="px-3.5 py-3 text-right min-w-28 border-l border-border">
                    Total Saved
                  </th>
                  <th className="px-3.5 py-3 text-right min-w-26">Returned</th>
                  <th className="px-4 py-3 text-right min-w-28 text-foreground">
                    Net Balance
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {matrix.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="sticky left-0 z-10 bg-card px-4 py-3 border-r border-border">
                      <Link
                        href={`/dashboard/members/${row.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer block truncate max-w-44"
                      >
                        {row.name}
                      </Link>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {row.role}
                        </span>
                        {row.status !== "ACTIVE" && (
                          <StatusPill status={row.status} />
                        )}
                      </div>
                    </td>

                    {matrix.months.map((m) => {
                      const cell = row.monthlyBreakdown[m.month];
                      return (
                        <td
                          key={m.month}
                          className="px-3 py-3 text-right font-money whitespace-nowrap"
                        >
                          {cell === null ? (
                            <span className="text-muted-foreground/50">—</span>
                          ) : cell.amount > 0 ? (
                            <div>
                              <span className="font-medium text-foreground">
                                {formatTaka(cell.amount)}
                              </span>
                              {cell.count > 1 && (
                                <span className="block text-[10px] text-muted-foreground">
                                  {cell.count} deposits
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/70 text-xs">
                              ৳ 0
                            </span>
                          )}
                        </td>
                      );
                    })}

                    <td className="px-3.5 py-3 text-right font-money font-medium text-foreground border-l border-border whitespace-nowrap">
                      {formatTaka(row.totalDeposited)}
                    </td>
                    <td className="px-3.5 py-3 text-right font-money text-muted-foreground whitespace-nowrap">
                      {formatTaka(row.totalReturned)}
                    </td>
                    <td className="px-4 py-3 text-right font-money font-semibold text-primary whitespace-nowrap">
                      {formatTaka(row.netBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Monthly Totals & Progress Footer */}
              <tfoot className="bg-muted/70 border-t-2 border-border font-money text-xs">
                <tr>
                  <td className="sticky left-0 z-10 bg-muted px-4 py-3 font-semibold text-foreground border-r border-border">
                    Collected Total
                  </td>
                  {matrix.months.map((m) => (
                    <td
                      key={m.month}
                      className="px-3 py-3 text-right whitespace-nowrap"
                    >
                      <div className="font-semibold text-foreground">
                        {formatTaka(m.collectedAmount)}
                      </div>
                      {m.targetAmount > 0 && (
                        <div className="text-[10px] text-primary font-medium mt-0.5">
                          {m.progressPercent}% of goal
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="px-3.5 py-3 text-right font-semibold text-foreground border-l border-border whitespace-nowrap">
                    {formatTaka(grandDeposited)}
                  </td>
                  <td className="px-3.5 py-3 text-right font-semibold text-muted-foreground whitespace-nowrap">
                    {formatTaka(grandReturned)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-primary whitespace-nowrap">
                    {formatTaka(grandNet)}
                  </td>
                </tr>
              </tfoot>
            </table>
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
