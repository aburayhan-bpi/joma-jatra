import { AuthUser } from "../../core/auth-guard";
import { connectDB } from "../../core/db";
import {
  getAllAccountBalances,
  getGroupFundSummary,
  getMemberBalance,
  getMemberBalancesMap,
} from "../../shared/accounting.service";
import { formatYearMonth, roundMoney, toObjectId } from "../../shared/normalize";
import { DepositModel } from "../deposits/deposit.model";
import { UserModel } from "../members/user.model";
import { MonthlyTargetModel } from "../monthly-targets/monthly-target.model";
import { getMonthlyTargetByMonth } from "../monthly-targets/monthly-target.service";
import { PaymentAccountModel } from "../payment-accounts/payment-account.model";
import { DepositReturnModel } from "../returns/deposit-return.model";

/**
 * Role-aware Dashboard Summary:
 * - Full reconciled Group Fund metrics (Cash in Hand, Unsettled Payable, Active Net Fund)
 * - Account-wise & Method-wise live balances
 * - Current Month Target progress
 * - Personal "My Savings" summary for the authenticated user
 * - Pending Approval quick queue for ADMIN & CASHIER
 */
export async function getDashboardSummary(actor: AuthUser, monthParam?: string) {
  await connectDB();

  const currentMonth = monthParam || formatYearMonth(new Date());
  const actorObjectId = toObjectId(actor.id, "actorId");

  const [
    fundSummary,
    currentMonthStats,
    accounts,
    accountBalancesMap,
    activeMembersCount,
    inactiveMembersCount,
    pendingDepositsCount,
    pendingReturnsCount,
    myBalance,
    myCurrentMonthAgg,
    myPrivateGoalDoc,
  ] = await Promise.all([
    getGroupFundSummary(),
    getMonthlyTargetByMonth(currentMonth),
    PaymentAccountModel.find({ isDeleted: false })
      .sort({ method: 1, createdAt: 1 })
      .lean(),
    getAllAccountBalances(),
    UserModel.countDocuments({ status: "ACTIVE", isDeleted: false }),
    UserModel.countDocuments({
      $or: [{ status: "INACTIVE" }, { isDeleted: true }],
    }),
    DepositModel.countDocuments({ status: "PENDING", isDeleted: false }),
    DepositReturnModel.countDocuments({ status: "PENDING", isDeleted: false }),
    getMemberBalance(actorObjectId),
    DepositModel.aggregate<{ _id: null; total: number }>([
      {
        $match: {
          memberId: actorObjectId,
          month: currentMonth,
          status: "APPROVED",
          isDeleted: false,
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    UserModel.findById(actorObjectId).select("+personalMonthlyGoal").lean(),
  ]);

  // Build account-wise and method-wise breakdown
  const accountBalances = accounts.map((acc) => {
    const summary = accountBalancesMap.get(acc._id.toString());
    return {
      id: acc._id.toString(),
      method: acc.method,
      accountName: acc.accountName,
      accountNumber: acc.accountNumber,
      accountType: acc.accountType,
      isActive: acc.isActive,
      balance: summary?.balance || 0,
    };
  });

  const methodTotalsMap = new Map<string, number>();
  for (const acc of accountBalances) {
    methodTotalsMap.set(
      acc.method,
      roundMoney((methodTotalsMap.get(acc.method) || 0) + acc.balance),
    );
  }
  const methodBalances = Array.from(methodTotalsMap.entries()).map(
    ([method, balance]) => ({ method, balance }),
  );

  // Include quick approval queue for ADMIN / CASHIER
  let pendingQueue = null;
  if (actor.role === "ADMIN" || actor.role === "CASHIER") {
    const [pendingDeposits, pendingReturns] = await Promise.all([
      DepositModel.find({ status: "PENDING", isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("memberId", "name email role")
        .populate("paymentAccountId", "accountName method")
        .lean(),
      DepositReturnModel.find({ status: "PENDING", isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("memberId", "name email role")
        .populate("paymentAccountId", "accountName method")
        .lean(),
    ]);

    pendingQueue = {
      deposits: pendingDeposits.map((d) => ({ ...d, id: d._id.toString() })),
      returns: pendingReturns.map((r) => ({ ...r, id: r._id.toString() })),
    };
  }

  const myCurrentMonthDeposited = roundMoney(myCurrentMonthAgg[0]?.total || 0);
  const personalMonthlyGoal = roundMoney(
    myPrivateGoalDoc?.personalMonthlyGoal || 0,
  );
  const personalGoalRemaining = roundMoney(
    Math.max(0, personalMonthlyGoal - myCurrentMonthDeposited),
  );
  const personalGoalProgressPercent =
    personalMonthlyGoal > 0
      ? Math.round((myCurrentMonthDeposited / personalMonthlyGoal) * 100)
      : 0;

  return {
    fundSummary,
    currentMonth: currentMonthStats,
    accountBalances,
    methodBalances,
    counts: {
      activeMembersCount,
      inactiveMembersCount,
      pendingDepositsCount,
      pendingReturnsCount,
    },
    mySavings: {
      ...myBalance,
      currentMonthDeposited: myCurrentMonthDeposited,
      personalMonthlyGoal,
      personalGoalRemaining,
      personalGoalProgressPercent,
    },
    pendingQueue,
  };
}

/**
 * Returns Member × Month flexible savings matrix + Monthly Chart series.
 * Months before a member's `joinedAt` month return `null` so UI cleanly renders "—".
 */
export async function getMonthlyMatrix(params?: {
  year?: string;
  includeInactive?: boolean;
}) {
  await connectDB();

  const yearPrefix = params?.year ? `${params.year}-` : null;

  const targetFilter = yearPrefix
    ? { month: { $regex: `^${yearPrefix}` } }
    : {};
  const depositMatch: Record<string, unknown> = {
    status: "APPROVED",
    isDeleted: false,
    ...(yearPrefix ? { month: { $regex: `^${yearPrefix}` } } : {}),
  };

  const userFilter: Record<string, unknown> = params?.includeInactive
    ? {}
    : { status: "ACTIVE", isDeleted: false };

  const [targets, monthlyDepositsAgg, users] = await Promise.all([
    MonthlyTargetModel.find(targetFilter).sort({ month: 1 }).lean(),
    DepositModel.aggregate<{
      _id: { memberId: string; month: string };
      amount: number;
      count: number;
    }>([
      { $match: depositMatch },
      {
        $group: {
          _id: { memberId: "$memberId", month: "$month" },
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
    UserModel.find(userFilter).sort({ joinedAt: 1, createdAt: 1 }).lean(),
  ]);

  const monthSet = new Set<string>();
  const currentMonth = formatYearMonth(new Date());

  // When a specific year is selected, always render the full 12-month calendar register (Jan -> Dec)
  if (params?.year) {
    for (let m = 1; m <= 12; m += 1) {
      monthSet.add(`${params.year}-${String(m).padStart(2, "0")}`);
    }
  } else {
    monthSet.add(currentMonth);
  }
  for (const t of targets) monthSet.add(t.month);
  for (const row of monthlyDepositsAgg) monthSet.add(row._id.month);

  const sortedMonths = Array.from(monthSet).sort();
  const targetMap = new Map(targets.map((t) => [t.month, t]));

  // Aggregate per-month group totals + per-member-month breakdown
  const monthCollectedMap = new Map<
    string,
    { collectedAmount: number; depositCount: number }
  >();
  const memberMonthMap = new Map<string, { amount: number; count: number }>();

  for (const row of monthlyDepositsAgg) {
    const memberKey = String(row._id.memberId);
    const monthKey = row._id.month;

    memberMonthMap.set(`${memberKey}::${monthKey}`, {
      amount: roundMoney(row.amount),
      count: row.count,
    });

    const prev = monthCollectedMap.get(monthKey) || {
      collectedAmount: 0,
      depositCount: 0,
    };
    monthCollectedMap.set(monthKey, {
      collectedAmount: roundMoney(prev.collectedAmount + row.amount),
      depositCount: prev.depositCount + row.count,
    });
  }

  const months = sortedMonths.map((month) => {
    const target = targetMap.get(month);
    const stats = monthCollectedMap.get(month);
    const targetAmount = target?.targetAmount || 0;
    const collectedAmount = roundMoney(stats?.collectedAmount || 0);
    const progressPercent =
      targetAmount > 0 ? Math.round((collectedAmount / targetAmount) * 100) : 0;

    return {
      month,
      hasTarget: Boolean(target),
      targetAmount,
      collectedAmount,
      depositCount: stats?.depositCount || 0,
      progressPercent,
    };
  });

  const userIds = users.map((u) => u._id);
  const balancesMap = await getMemberBalancesMap(userIds);

  const rows = users.map((u) => {
    const userId = u._id.toString();
    const joinedMonth = formatYearMonth(new Date(u.joinedAt));
    const balance = balancesMap.get(userId) ?? {
      totalDeposited: 0,
      totalReturned: 0,
      totalDonatedWaived: 0,
      netBalance: 0,
      pendingDepositsCount: 0,
      pendingReturnsCount: 0,
    };

    const monthlyBreakdown: Record<
      string,
      { amount: number; count: number } | null
    > = {};

    for (const month of sortedMonths) {
      const cell = memberMonthMap.get(`${userId}::${month}`);
      if (cell) {
        monthlyBreakdown[month] = cell;
      } else if (month < joinedMonth) {
        // Member had not joined yet in this month -> UI renders "—"
        monthlyBreakdown[month] = null;
      } else {
        monthlyBreakdown[month] = { amount: 0, count: 0 };
      }
    }

    return {
      id: userId,
      name: u.name,
      email: u.email,
      profileImage: u.profileImage || "",
      role: u.role,
      status: u.status,
      isDeleted: u.isDeleted,
      joinedAt: u.joinedAt,
      totalDeposited: balance.totalDeposited,
      totalReturned: balance.totalReturned,
      netBalance: balance.netBalance,
      monthlyBreakdown,
    };
  });

  return {
    months,
    rows,
  };
}
