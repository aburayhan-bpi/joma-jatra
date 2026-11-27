"use client";

import CustomModal from "@/components/shared/CustomModal";
import InlineLoader from "@/components/shared/InlineLoader";
import { useGetMonthlyMatrixQuery } from "@/redux/api/dashboard/dashboardApi";
import { IGroupFundSummary } from "@/types/global";
import {
  formatMonthLabel,
  formatTaka,
  getCurrentYearMonth,
} from "@/utils/formatMoney";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

interface MonthlyDepositBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  fundSummary: IGroupFundSummary;
}

interface MonthContributor {
  id: string;
  name: string;
  isInactive: boolean;
  amount: number;
  count: number;
}

interface MonthSummaryGroup {
  month: string;
  collectedAmount: number;
  targetAmount: number;
  progressPercent: number;
  depositsCount: number;
  contributors: MonthContributor[];
}

/**
 * Quick month-wise group deposit breakdown opened from the "Total Cash in Hand" card.
 * Shows each month's total collected amount along with a compact member-by-member summary
 * of who contributed how much in that month.
 */
export default function MonthlyDepositBreakdownModal({
  isOpen,
  onClose,
  fundSummary,
}: MonthlyDepositBreakdownModalProps) {
  const {
    data: matrixRes,
    isLoading,
    isError,
  } = useGetMonthlyMatrixQuery({ includeInactive: true }, { skip: !isOpen });

  // Track user-toggled months (overrides default open state cleanly without effects)
  const [toggledMonths, setToggledMonths] = useState<Record<string, boolean>>(
    {},
  );

  const currentYearMonth = getCurrentYearMonth();

  const monthlyGroups = useMemo<MonthSummaryGroup[]>(() => {
    const months = matrixRes?.data?.months || [];
    const memberRows = matrixRes?.data?.rows || [];

    return months
      .filter((m) => m.collectedAmount > 0)
      .map((m) => {
        const contributors: MonthContributor[] = [];
        let depositsCount = 0;

        for (const row of memberRows) {
          const cell = row.monthlyBreakdown[m.month];
          if (cell && cell.amount > 0) {
            depositsCount += cell.count;
            contributors.push({
              id: row.id,
              name: row.name,
              isInactive: row.status !== "ACTIVE" || row.isDeleted,
              amount: cell.amount,
              count: cell.count,
            });
          }
        }

        // Highest contribution first, then alphabetical for consistent reading
        contributors.sort(
          (a, b) => b.amount - a.amount || a.name.localeCompare(b.name),
        );

        return {
          month: m.month,
          collectedAmount: m.collectedAmount,
          targetAmount: m.targetAmount,
          progressPercent: m.progressPercent,
          depositsCount: depositsCount || m.depositCount,
          contributors,
        };
      })
      // Show most recent month first
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [matrixRes]);

  const totalMonthDeposits = useMemo(
    () => monthlyGroups.reduce((sum, item) => sum + item.collectedAmount, 0),
    [monthlyGroups],
  );
  const totalEntriesCount = useMemo(
    () => monthlyGroups.reduce((sum, item) => sum + item.depositsCount, 0),
    [monthlyGroups],
  );

  // Open all months by default when <= 3 months exist, otherwise open the latest month
  const isMonthExpanded = (month: string, index: number) => {
    if (month in toggledMonths) return toggledMonths[month];
    return monthlyGroups.length <= 3 ? true : index === 0;
  };

  const toggleMonth = (month: string, index: number) => {
    const currentlyOpen = isMonthExpanded(month, index);
    setToggledMonths((prev) => ({ ...prev, [month]: !currentlyOpen }));
  };

  const allExpanded =
    monthlyGroups.length > 0 &&
    monthlyGroups.every((g, idx) => isMonthExpanded(g.month, idx));

  const handleToggleAll = () => {
    const nextState: Record<string, boolean> = {};
    for (const g of monthlyGroups) {
      nextState[g.month] = !allExpanded;
    }
    setToggledMonths(nextState);
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Month-wise Deposit Summary"
      subtitle="Who contributed how much in each month and overall cash reconciliation"
      className="max-w-xl"
    >
      <div className="space-y-4">
        {/* Compact Fund Reconciliation Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded border border-border bg-muted/40 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Total Deposited</p>
            <p className="text-sm font-semibold text-foreground font-money mt-0.5">
              {formatTaka(fundSummary.totalApprovedDeposits)}
            </p>
          </div>
          <div className="rounded border border-border bg-muted/40 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Returned</p>
            <p className="text-sm font-semibold text-gold-dark font-money mt-0.5">
              -{formatTaka(fundSummary.totalApprovedPayoutReturns)}
            </p>
          </div>
          <div className="rounded border border-border bg-muted/40 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Total Charges</p>
            <p className="text-sm font-semibold text-muted-foreground font-money mt-0.5">
              -{formatTaka(fundSummary.totalCharges)}
            </p>
          </div>
          <div className="rounded border border-[#cce3d8] bg-[#e9f4ef] px-3 py-2">
            <p className="text-[11px] text-[#046c4e] font-medium">
              Cash in Hand
            </p>
            <p className="text-sm font-semibold text-[#046c4e] font-money mt-0.5">
              {formatTaka(fundSummary.totalCashInHand)}
            </p>
          </div>
        </div>

        {fundSummary.totalDonatedWaivers > 0 && (
          <div className="rounded border border-[#cae1e3] bg-[#e9f4f5]/60 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-foreground">
              Includes{" "}
              <strong className="font-money text-[#1c6b72]">
                {formatTaka(fundSummary.totalDonatedWaivers)}
              </strong>{" "}
              in donated/waived group reserve (retained in fund, not split across
              members)
            </span>
            <Link
              href="/dashboard/returns?returnType=DONATED_WAIVER"
              onClick={onClose}
              className="text-primary hover:text-brand-dark font-medium whitespace-nowrap cursor-pointer"
            >
              View donations →
            </Link>
          </div>
        )}

        {/* Month-wise Member Contributions */}
        {isLoading ? (
          <InlineLoader text="Loading month-wise deposits..." />
        ) : isError ? (
          <div className="rounded border border-border bg-muted/40 p-5 text-center text-xs text-muted-foreground">
            Unable to load month-wise breakdown right now. Please try again.
          </div>
        ) : monthlyGroups.length === 0 ? (
          <div className="rounded border border-border bg-muted/40 p-6 text-center space-y-1.5">
            <CalendarDays className="w-5 h-5 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-foreground">
              No approved deposits yet
            </p>
            <p className="text-xs text-muted-foreground">
              Verified monthly totals will appear here once deposits are
              approved.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {monthlyGroups.length > 1 && (
              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
                <span>
                  {monthlyGroups.length} months · {totalEntriesCount} approved
                  deposits
                </span>
                <button
                  type="button"
                  onClick={handleToggleAll}
                  className="text-primary hover:text-brand-dark font-medium cursor-pointer"
                >
                  {allExpanded ? "Collapse all" : "Expand all"}
                </button>
              </div>
            )}

            <div className="space-y-2">
              {monthlyGroups.map((group, index) => {
                const isCurrent = group.month === currentYearMonth;
                const expanded = isMonthExpanded(group.month, index);

                return (
                  <div
                    key={group.month}
                    className="border border-border rounded-md overflow-hidden bg-card"
                  >
                    {/* Month Header Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleMonth(group.month, index)}
                      className="w-full px-3.5 py-2.5 bg-muted/50 hover:bg-muted/80 transition-colors flex items-center justify-between gap-3 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {expanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-foreground">
                              {formatMonthLabel(group.month)}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] bg-primary text-primary-foreground leading-none">
                                Now
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {group.contributors.length} member
                            {group.contributors.length === 1 ? "" : "s"} ·{" "}
                            {group.depositsCount} deposit
                            {group.depositsCount === 1 ? "" : "s"}
                            {group.targetAmount > 0 && (
                              <span className="font-money">
                                {" "}
                                · Target {formatTaka(group.targetAmount)} (
                                {group.progressPercent}%)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <span className="text-sm font-bold text-primary font-money whitespace-nowrap">
                        {formatTaka(group.collectedAmount)}
                      </span>
                    </button>

                    {/* Member-by-member Breakdown for this Month */}
                    {expanded && (
                      <ul className="divide-y divide-border/70 border-t border-border">
                        {group.contributors.map((member) => (
                          <li
                            key={member.id}
                            className="px-3.5 py-2 flex items-center justify-between gap-3 text-xs hover:bg-muted/25"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Link
                                href={`/dashboard/members/${member.id}`}
                                onClick={onClose}
                                title={member.name}
                                className="font-medium text-foreground hover:text-primary hover:underline truncate cursor-pointer"
                              >
                                {member.name}
                              </Link>
                              {member.isInactive && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                                  Former
                                </span>
                              )}
                              {member.count > 1 && (
                                <span className="text-[11px] text-muted-foreground shrink-0">
                                  ({member.count}×)
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-foreground font-money whitespace-nowrap">
                              {formatTaka(member.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grand Total Bar */}
            <div className="rounded-md border border-border bg-muted/50 px-3.5 py-2.5 flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wide text-foreground">
                All-Time Total ({monthlyGroups.length}{" "}
                {monthlyGroups.length === 1 ? "month" : "months"})
              </span>
              <span className="text-sm font-bold text-foreground font-money">
                {formatTaka(totalMonthDeposits)}
              </span>
            </div>
          </div>
        )}

        {/* Footer Link to Full Sheet */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <span className="text-muted-foreground">
            Click any member name to view their audit trail
          </span>
          <Link
            href="/dashboard/monthly-sheet"
            onClick={onClose}
            className="inline-flex items-center gap-1 font-medium text-primary hover:text-brand-dark cursor-pointer"
          >
            Open Full Monthly Sheet
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </CustomModal>
  );
}
