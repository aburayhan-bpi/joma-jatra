"use client";

import InlineLoader from "@/components/shared/InlineLoader";
import LedgerStatCard from "@/components/shared/LedgerStatCard";
import PageHeader from "@/components/shared/PageHeader";
import ProofPreviewModal, {
  ProofPreviewData,
} from "@/components/shared/ProofPreviewModal";
import StatusPill from "@/components/shared/StatusPill";
import {
  useGetDashboardSummaryQuery,
  useGetMonthlyMatrixQuery,
} from "@/redux/api/dashboard/dashboardApi";
import { useReviewDepositMutation } from "@/redux/api/deposits/depositsApi";
import { selectCurrentUser } from "@/redux/features/user/authSlice";
import { useAppSelector } from "@/redux/hooks";
import { formatDate } from "@/utils/formatDate";
import {
  formatMonthLabel,
  formatTaka,
  getApiErrorMessage,
  getPaymentMethodLabel,
} from "@/utils/formatMoney";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  HandCoins,
  Landmark,
  Lock,
  Pencil,
  PiggyBank,
  Plus,
  RotateCcw,
  Sheet,
  ShieldCheck,
  Target,
  UserMinus,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import FundCardInfoModal, { OverviewInfoCardKey } from "./FundCardInfoModal";
import MonthlyDepositBreakdownModal from "./MonthlyDepositBreakdownModal";
import PersonalGoalModal from "./PersonalGoalModal";
import ResetTestDataModal from "./ResetTestDataModal";

/**
 * Main Dashboard Overview (/dashboard)
 * Shows personal savings summary, group fund reconciliation with eye-cold stat cards,
 * monthly progress chart, account balances with 1-click copy, and pending approvals.
 */
export default function OverviewPage() {
  const user = useAppSelector(selectCurrentUser);
  const isAdmin = user?.role === "ADMIN";
  const isManager = isAdmin || user?.role === "CASHIER";

  const { data: summaryRes, isLoading } = useGetDashboardSummaryQuery();
  // Include inactive/former members so monthly chart bars match the group Target card and See More modal
  const { data: matrixRes } = useGetMonthlyMatrixQuery({
    year: String(new Date().getFullYear()),
    includeInactive: true,
  });

  const [reviewDeposit, { isLoading: isReviewing }] =
    useReviewDepositMutation();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [personalGoalModalOpen, setPersonalGoalModalOpen] = useState(false);
  const [cashBreakdownOpen, setCashBreakdownOpen] = useState(false);
  const [infoCardKey, setInfoCardKey] = useState<OverviewInfoCardKey | null>(
    null,
  );
  const [proofPreview, setProofPreview] = useState<ProofPreviewData | null>(
    null,
  );

  // Copy payment account number to clipboard for fast bKash/Nagad/Bank sending
  const handleCopyNumber = async (id: string, accountNumber: string) => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopiedId(id);
      toast.success("Account number copied");
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      toast.error("Could not copy number");
    }
  };

  // Quick 1-click deposit approval directly from the overview queue
  const handleQuickApproveDeposit = async (depositId: string) => {
    try {
      await reviewDeposit({ id: depositId, status: "APPROVED" }).unwrap();
      toast.success("Deposit approved");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not approve deposit"));
    }
  };

  if (isLoading) {
    return <InlineLoader text="Loading ledger overview..." />;
  }

  const summary = summaryRes?.data;
  if (!summary) {
    return (
      <div className="bg-card border border-border rounded-md p-6 text-sm text-muted-foreground">
        Unable to load dashboard summary. Please refresh the page.
      </div>
    );
  }

  const { fundSummary, currentMonth, accountBalances, counts, mySavings } =
    summary;

  // Prepare recent 6 months chart data up to the current month (or any month with activity)
  const currentMonthKey = currentMonth.month;
  const relevantMonths = (matrixRes?.data?.months || []).filter(
    (m) =>
      m.month <= currentMonthKey || m.collectedAmount > 0 || m.targetAmount > 0,
  );
  const chartData = relevantMonths.slice(-6).map((m) => ({
    month: formatMonthLabel(m.month).replace(/\s\d{4}$/, ""),
    collected: m.collectedAmount,
    target: m.targetAmount,
  }));

  const pendingDeposits = summary.pendingQueue?.deposits || [];
  const pendingReturns = summary.pendingQueue?.returns || [];
  const hasPendingQueue =
    isManager && (pendingDeposits.length > 0 || pendingReturns.length > 0);
  const personalGoalAchieved =
    mySavings.personalGoalAchieved ??
    Math.max(0, Math.min(mySavings.currentMonthDeposited, mySavings.netBalance));

  return (
    <div className="space-y-5">
      {/* Page Title & Primary Quick Actions */}
      <PageHeader
        title="Overview"
        subtitle={`Group savings ledger for ${formatMonthLabel(currentMonth.month)} • ${counts.activeMembersCount} active members`}
        actions={
          <>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setResetModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 h-9 min-h-9 px-3.5 rounded border border-error/40 bg-error-5 text-error text-xs font-medium leading-none shadow-[0_1px_2px_rgba(7,42,31,0.05)] hover:bg-error-20 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Test DB
              </button>
            )}
            <Link
              href="/dashboard/monthly-sheet"
              className="inline-flex items-center justify-center gap-1.5 h-9 min-h-9 px-3.5 rounded border border-[#b4cabe] bg-card text-foreground text-xs font-medium leading-none shadow-[0_1px_2px_rgba(7,42,31,0.05)] hover:bg-muted hover:border-[#8faea0] transition-colors cursor-pointer"
            >
              <Sheet className="w-3.5 h-3.5 text-muted-foreground" />
              Monthly Sheet
            </Link>
            <Link
              href="/dashboard/deposits?action=new"
              className="inline-flex items-center justify-center gap-1.5 h-9 min-h-9 px-3.5 rounded border border-primary bg-primary text-primary-foreground text-xs font-medium leading-none shadow-[0_1px_2px_rgba(7,42,31,0.08)] hover:bg-brand-dark hover:border-brand-dark transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Deposit
            </Link>
          </>
        }
      />

      {/* Personal Savings Strip */}
      <section className="bg-card border border-border rounded-md p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-border">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
              My Savings Summary
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your personal verified contribution balance
            </p>
          </div>
          {user?.id && (
            <Link
              href={`/dashboard/members/${user.id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-brand-dark cursor-pointer"
            >
              View My Audit Trail
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-3.5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded border bg-[#e9f4ef] text-[#046c4e] border-[#cce3d8] flex items-center justify-center shrink-0 mt-0.5">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">My Net Balance</p>
              <p className="text-lg font-semibold text-primary font-money mt-0.5">
                {formatTaka(mySavings.netBalance)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded border bg-[#edf3f8] text-[#285a84] border-[#d2e0ed] flex items-center justify-center shrink-0 mt-0.5">
              <PiggyBank className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Deposited</p>
              <p className="text-lg font-semibold text-foreground font-money mt-0.5">
                {formatTaka(mySavings.totalDeposited)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded border bg-[#eef1f8] text-[#3b5284] border-[#d4dced] flex items-center justify-center shrink-0 mt-0.5">
              <HandCoins className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Returned</p>
              <p className="text-lg font-semibold text-foreground font-money mt-0.5">
                {formatTaka(mySavings.totalReturned)}
              </p>
              {mySavings.totalDonatedWaived > 0 && (
                <p className="text-[11px] text-[#1c6b72] font-money mt-0.5">
                  Includes {formatTaka(mySavings.totalDonatedWaived)} donated
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded border bg-[#e9f4f5] text-[#1c6b72] border-[#cae1e3] flex items-center justify-center shrink-0 mt-0.5">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {formatMonthLabel(currentMonth.month)} Deposited
              </p>
              <p className="text-lg font-semibold text-foreground font-money mt-0.5">
                {formatTaka(mySavings.currentMonthDeposited)}
              </p>
              {mySavings.pendingDepositsCount > 0 && (
                <p className="text-[11px] text-gold-dark mt-0.5">
                  {mySavings.pendingDepositsCount} pending approval
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Private Personal Monthly Goal Tracker (Self-Only Motivation Strip) */}
        <div className="mt-4 pt-3.5 border-t border-border">
          {mySavings.personalMonthlyGoal > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    My {formatMonthLabel(currentMonth.month)} Personal Goal
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    Private
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="font-money text-foreground">
                    <strong>{formatTaka(personalGoalAchieved)}</strong>{" "}
                    <span className="text-muted-foreground">
                      / {formatTaka(mySavings.personalMonthlyGoal)}
                    </span>
                  </span>
                  {mySavings.personalGoalProgressPercent >= 100 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3" />
                      Goal Reached ({mySavings.personalGoalProgressPercent}%)
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-primary font-money">
                      {mySavings.personalGoalProgressPercent}%
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setPersonalGoalModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                </div>
              </div>

              <div className="w-full h-2 bg-muted rounded-xs overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    mySavings.personalGoalProgressPercent >= 100
                      ? "bg-success"
                      : "bg-primary"
                  }`}
                  style={{
                    width: `${Math.min(mySavings.personalGoalProgressPercent, 100)}%`,
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>
                  {mySavings.personalGoalRemaining > 0 ? (
                    <>
                      <strong className="text-foreground font-money">
                        {formatTaka(mySavings.personalGoalRemaining)}
                      </strong>{" "}
                      more to reach your personal goal this month
                    </>
                  ) : (
                    "Great job! You hit your personal savings goal for this month."
                  )}
                  {mySavings.currentMonthDeposited > personalGoalAchieved && (
                    <span className="text-muted-foreground ml-1.5">
                      • Capped by your {formatTaka(mySavings.netBalance)} net balance
                    </span>
                  )}
                  {mySavings.pendingDepositsCount > 0 && (
                    <span className="text-gold-dark ml-1.5">
                      • {mySavings.pendingDepositsCount} deposit pending approval
                    </span>
                  )}
                </span>
                <span>Visible only to you</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
                <span>
                  Want to stay motivated? Set a{" "}
                  <strong className="text-foreground">
                    private personal monthly goal
                  </strong>{" "}
                  (visible only to you).
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPersonalGoalModalOpen(true)}
                className="inline-flex items-center gap-1 font-medium text-primary hover:text-brand-dark cursor-pointer"
              >
                <Target className="w-3.5 h-3.5" />
                Set Personal Goal
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Group Fund Reconciliation Cards (Eye-Cold Financial Palette) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <LedgerStatCard
          label="Total Cash in Hand"
          value={formatTaka(fundSummary.totalCashInHand)}
          icon={<Banknote className="w-[18px] h-[18px]" />}
          tone="steel"
          onInfoClick={() => setInfoCardKey("cash")}
          badge={
            fundSummary.reconciliationDifference === 0 ? (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-success font-medium">
                <CheckCircle2 className="w-3 h-3" />
                Balanced
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-0.5 text-[11px] text-error font-medium"
                title="Total cash in hand differs from the sum of payment accounts"
              >
                <AlertTriangle className="w-3 h-3" />
                Diff {formatTaka(fundSummary.reconciliationDifference)}
              </span>
            )
          }
          subtext={
            <div className="flex items-center justify-between gap-2">
              <span>
                Sum of {accountBalances.length} payment account
                {accountBalances.length === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={() => setCashBreakdownOpen(true)}
                className="inline-flex items-center gap-0.5 text-primary hover:text-brand-dark font-medium whitespace-nowrap cursor-pointer"
              >
                See more
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          }
        />

        <LedgerStatCard
          label="Active Net Fund"
          value={formatTaka(fundSummary.activeNetFund)}
          valueClassName="text-primary"
          icon={<ShieldCheck className="w-[18px] h-[18px]" />}
          tone="emerald"
          onInfoClick={() => setInfoCardKey("activeFund")}
          subtext={
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
              <span className="font-money">
                Charges: {formatTaka(fundSummary.totalCharges)}
              </span>
              <Link
                href="/dashboard/returns?returnType=DONATED_WAIVER"
                className="font-money text-primary hover:text-brand-dark hover:underline cursor-pointer"
                title="Retained group reserve from donated/waived member balances"
              >
                Donated: {formatTaka(fundSummary.totalDonatedWaivers)}
              </Link>
            </div>
          }
        />

        <LedgerStatCard
          label="Unsettled Former Payable"
          value={formatTaka(fundSummary.unsettledFormerMemberPayable)}
          valueClassName={
            fundSummary.unsettledFormerMemberPayable > 0
              ? "text-gold-dark"
              : "text-foreground"
          }
          icon={<UserMinus className="w-[18px] h-[18px]" />}
          tone={
            fundSummary.unsettledFormerMemberPayable > 0 ? "amber" : "slate"
          }
          onInfoClick={() => setInfoCardKey("formerPayable")}
          subtext={
            <div className="flex items-center justify-between gap-2">
              <span>
                {counts.inactiveMembersCount} inactive / former member
                {counts.inactiveMembersCount === 1 ? "" : "s"}
              </span>
              {counts.inactiveMembersCount > 0 && (
                <Link
                  href="/dashboard/members?tab=former"
                  className="inline-flex items-center gap-0.5 text-primary hover:text-brand-dark font-medium whitespace-nowrap cursor-pointer"
                >
                  View
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          }
        />

        <LedgerStatCard
          label={`${formatMonthLabel(currentMonth.month)} Target`}
          value={formatTaka(currentMonth.collectedAmount)}
          icon={<Target className="w-[18px] h-[18px]" />}
          tone="teal"
          onInfoClick={() => setInfoCardKey("monthTarget")}
          badge={
            <span className="text-[11px] font-semibold text-primary font-money">
              {currentMonth.progressPercent}%
            </span>
          }
          footer={
            <div className="w-full h-1.5 bg-muted rounded-xs overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${Math.min(currentMonth.progressPercent, 100)}%`,
                }}
              />
            </div>
          }
          subtext={
            <span className="font-money">
              Target:{" "}
              {currentMonth.targetAmount > 0
                ? formatTaka(currentMonth.targetAmount)
                : "Not set yet"}
            </span>
          }
        />
      </section>

      {/* Chart + Payment Accounts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Monthly Collection vs Target Bar Chart */}
        <div className="lg:col-span-7 bg-card border border-border rounded-md p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Monthly Collection vs Target
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Approved group deposits over recent months
              </p>
            </div>
            <Link
              href="/dashboard/monthly-sheet"
              className="text-xs font-medium text-primary hover:text-brand-dark cursor-pointer"
            >
              Full Sheet
            </Link>
          </div>

          {chartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={6}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#d7e5dd"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "#557066" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#557066" }}
                    axisLine={false}
                    tickLine={false}
                    width={62}
                    tickFormatter={(v) => `৳${Number(v).toLocaleString()}`}
                  />
                  <Tooltip
                    formatter={(value) => formatTaka(Number(value))}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #d7e5dd",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="target"
                    name="Target"
                    fill="#d7e5dd"
                    radius={[2, 2, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="collected"
                    name="Collected"
                    fill="#046c4e"
                    radius={[2, 2, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
              No monthly collection data recorded yet.
            </div>
          )}
        </div>

        {/* Account-wise Live Balances (with 1-Click Copy) */}
        <div className="lg:col-span-5 bg-card border border-border rounded-md p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Payment Accounts
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Where the group funds are currently held
              </p>
            </div>
            <Link
              href="/dashboard/accounts"
              className="text-xs font-medium text-primary hover:text-brand-dark cursor-pointer"
            >
              Manage
            </Link>
          </div>

          {accountBalances.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 rounded-md border bg-[#edf3f8] text-[#285a84] border-[#d2e0ed] flex items-center justify-center mb-2.5">
                <Landmark className="w-5 h-5" />
              </div>
              <p className="text-xs text-muted-foreground">
                No payment accounts added yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border flex-1">
              {accountBalances.map((acc) => (
                <div
                  key={acc.id}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {acc.accountName}
                      </p>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-[3px] bg-muted text-muted-foreground">
                        {getPaymentMethodLabel(acc.method)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-mono text-muted-foreground">
                        {acc.accountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyNumber(acc.id, acc.accountNumber)
                        }
                        className="p-0.5 text-muted-foreground hover:text-primary cursor-pointer"
                        title="Copy account number"
                      >
                        {copiedId === acc.id ? (
                          <Check className="w-3 h-3 text-success" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground font-money shrink-0">
                    {formatTaka(acc.balance)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Pending Approval Queue (Admin & Cashier Only) */}
      {hasPendingQueue && (
        <section className="bg-card border border-border rounded-md overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Pending Approvals
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {counts.pendingDepositsCount} deposit(s) and{" "}
                {counts.pendingReturnsCount} return(s) waiting for review
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Link
                href="/dashboard/deposits?status=PENDING"
                className="font-medium text-primary hover:text-brand-dark cursor-pointer"
              >
                All Deposits
              </Link>
              <Link
                href="/dashboard/returns?status=PENDING"
                className="font-medium text-primary hover:text-brand-dark cursor-pointer"
              >
                All Returns
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Member</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Method / Ref</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingDeposits.map((dep) => {
                  const depMemberId = dep.memberId?._id || dep.memberId?.id;
                  const isOwnCashierRequest =
                    user?.role === "CASHIER" && depMemberId === user?.id;

                  return (
                    <tr key={dep.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <StatusPill status="APPROVED" label="Deposit" />
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {dep.memberId?.name || "Member"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(dep.depositDate)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {getPaymentMethodLabel(dep.paymentMethod)}
                        {dep.trxId ? ` • ${dep.trxId}` : ""}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold font-money text-foreground">
                        {formatTaka(dep.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {dep.proofImage && (
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
                              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-xs text-foreground hover:bg-muted cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              Proof
                            </button>
                          )}

                          {isOwnCashierRequest ? (
                            <span className="text-[11px] text-gold-dark font-medium px-2">
                              Awaiting Admin
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isReviewing}
                              onClick={() => handleQuickApproveDeposit(dep.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-brand-dark cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-3 h-3" />
                              Approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {pendingReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <StatusPill status="PENDING" label="Return" />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {ret.memberId?.name || "Member"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(ret.returnDate)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {ret.recipientAccount || ret.reason || "Return request"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold font-money text-gold-dark">
                      {formatTaka(ret.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href="/dashboard/returns?status=PENDING"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-border text-xs font-medium text-foreground hover:bg-muted cursor-pointer"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Proof Image Preview Modal */}
      <ProofPreviewModal
        proof={proofPreview}
        onClose={() => setProofPreview(null)}
      />

      {/* Fund KPI Card Bangla Explanation Modal */}
      <FundCardInfoModal
        cardKey={infoCardKey}
        onClose={() => setInfoCardKey(null)}
        fundSummary={fundSummary}
        currentMonth={currentMonth}
        inactiveMembersCount={counts.inactiveMembersCount}
        accountBalancesCount={accountBalances.length}
      />

      {/* Month-wise Total Deposits Breakdown Modal */}
      <MonthlyDepositBreakdownModal
        isOpen={cashBreakdownOpen}
        onClose={() => setCashBreakdownOpen(false)}
        fundSummary={fundSummary}
      />

      {/* Private Personal Monthly Goal Modal */}
      <PersonalGoalModal
        isOpen={personalGoalModalOpen}
        onClose={() => setPersonalGoalModalOpen(false)}
        currentGoal={mySavings.personalMonthlyGoal || 0}
        currentMonthLabel={formatMonthLabel(currentMonth.month)}
      />

      {/* Temporary Admin Test DB Reset Modal */}
      {isAdmin && (
        <ResetTestDataModal
          isOpen={resetModalOpen}
          onClose={() => setResetModalOpen(false)}
        />
      )}
    </div>
  );
}
