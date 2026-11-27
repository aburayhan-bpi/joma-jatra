import mongoose from "mongoose";
import { AccountChargeModel } from "../modules/charges/account-charge.model";
import { DepositModel } from "../modules/deposits/deposit.model";
import { UserModel } from "../modules/members/user.model";
import { PaymentAccountModel } from "../modules/payment-accounts/payment-account.model";
import { DepositReturnModel } from "../modules/returns/deposit-return.model";
import { AccountTransferModel } from "../modules/transfers/account-transfer.model";
import { roundMoney, toObjectId } from "./normalize";

export interface MemberBalanceSummary {
  totalDeposited: number;
  totalReturned: number;
  totalDonatedWaived: number;
  netBalance: number;
  pendingDepositsCount: number;
  pendingReturnsCount: number;
}

export interface AccountBalanceSummary {
  accountId: string;
  totalInDeposits: number;
  totalOutReturns: number;
  totalTransferIn: number;
  totalTransferOut: number;
  totalTransferFees: number;
  totalStandaloneCharges: number;
  balance: number;
}

export interface GroupFundSummary {
  totalApprovedDeposits: number;
  totalApprovedPayoutReturns: number;
  totalDonatedWaivers: number;
  totalTransferFees: number;
  totalStandaloneCharges: number;
  totalCharges: number;
  totalCashInHand: number;
  unsettledFormerMemberPayable: number;
  activeNetFund: number;
  accountBalancesSum: number;
  reconciliationDifference: number;
}

/**
 * Pure helper to calculate group fund reconciliation figures (unit-testable).
 */
export function computeFundReconciliation(params: {
  totalApprovedDeposits: number;
  totalApprovedPayoutReturns: number;
  totalTransferFees: number;
  totalStandaloneCharges: number;
  unsettledFormerMemberPayable: number;
  accountBalancesSum: number;
}) {
  const totalCharges = roundMoney(
    params.totalTransferFees + params.totalStandaloneCharges,
  );
  const totalCashInHand = roundMoney(
    params.totalApprovedDeposits -
      params.totalApprovedPayoutReturns -
      totalCharges,
  );
  const activeNetFund = roundMoney(
    totalCashInHand - params.unsettledFormerMemberPayable,
  );
  const reconciliationDifference = roundMoney(
    totalCashInHand - params.accountBalancesSum,
  );

  return {
    totalCharges,
    totalCashInHand,
    activeNetFund,
    reconciliationDifference,
  };
}

/**
 * Pure helper to calculate a single payment account balance (unit-testable).
 */
export function computeSingleAccountBalance(params: {
  totalInDeposits: number;
  totalOutReturns: number;
  totalTransferIn: number;
  totalTransferOut: number;
  totalTransferFees: number;
  totalStandaloneCharges: number;
}): number {
  return roundMoney(
    params.totalInDeposits +
      params.totalTransferIn -
      params.totalOutReturns -
      params.totalTransferOut -
      params.totalTransferFees -
      params.totalStandaloneCharges,
  );
}

/**
 * Pure helper for net cash sent to a member on a return after deducting payout fee.
 */
export function computeReturnNetPayout(
  grossAmount: number,
  payoutFee = 0,
): number {
  return roundMoney(Math.max(0, grossAmount - Math.max(0, payoutFee)));
}

/**
 * Pure validator for payout fee invariants across returns and settlement payouts.
 * Returns null if valid, otherwise a clear error message.
 */
export function validateReturnPayoutFee(
  grossAmount: number,
  payoutFee = 0,
  returnType?: string,
): string | null {
  if (payoutFee < 0) {
    return "Payout fee cannot be negative.";
  }
  if (returnType === "DONATED_WAIVER" && payoutFee > 0) {
    return "Donated/waived records cannot have a payout fee.";
  }
  if (payoutFee >= grossAmount) {
    return `Payout fee (৳${payoutFee}) must be less than the return amount (৳${grossAmount}) so at least ৳1 reaches the member.`;
  }
  return null;
}

/**
 * Pure helper for private personal monthly goal progress.
 * Caps progress by the member's verified netBalance so returned/waived funds do not inflate goal completion.
 */
export function computePersonalGoalProgress(params: {
  currentMonthDeposited: number;
  netBalance: number;
  personalMonthlyGoal: number;
}) {
  const goal = roundMoney(Math.max(0, params.personalMonthlyGoal));
  const achievedAmount = roundMoney(
    Math.max(0, Math.min(params.currentMonthDeposited, params.netBalance)),
  );
  const remainingAmount = roundMoney(Math.max(0, goal - achievedAmount));
  const progressPercent =
    goal > 0 ? Math.round((achievedAmount / goal) * 100) : 0;

  return {
    achievedAmount,
    remainingAmount,
    progressPercent,
  };
}

/**
 * Computes live financial summary for a single member from approved non-deleted records.
 */
export async function getMemberBalance(
  memberId: string | mongoose.Types.ObjectId,
): Promise<MemberBalanceSummary> {
  const objectId =
    typeof memberId === "string" ? toObjectId(memberId, "memberId") : memberId;

  const [depositAgg, returnAgg, pendingDepositsCount, pendingReturnsCount] =
    await Promise.all([
      DepositModel.aggregate<{ _id: null; total: number }>([
        {
          $match: {
            memberId: objectId,
            status: "APPROVED",
            isDeleted: false,
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      DepositReturnModel.aggregate<{ _id: string; total: number }>([
        {
          $match: {
            memberId: objectId,
            status: "APPROVED",
            isDeleted: false,
          },
        },
        { $group: { _id: "$returnType", total: { $sum: "$amount" } } },
      ]),
      DepositModel.countDocuments({
        memberId: objectId,
        status: "PENDING",
        isDeleted: false,
      }),
      DepositReturnModel.countDocuments({
        memberId: objectId,
        status: "PENDING",
        isDeleted: false,
      }),
    ]);

  const totalDeposited = roundMoney(depositAgg[0]?.total || 0);
  let totalReturned = 0;
  let totalDonatedWaived = 0;

  for (const row of returnAgg) {
    totalReturned += row.total;
    if (row._id === "DONATED_WAIVER") {
      totalDonatedWaived += row.total;
    }
  }

  totalReturned = roundMoney(totalReturned);
  totalDonatedWaived = roundMoney(totalDonatedWaived);
  const netBalance = roundMoney(totalDeposited - totalReturned);

  return {
    totalDeposited,
    totalReturned,
    totalDonatedWaived,
    netBalance,
    pendingDepositsCount,
    pendingReturnsCount,
  };
}

/**
 * Computes balances for a list of member IDs in a single batched aggregation query.
 */
export async function getMemberBalancesMap(
  memberIds?: mongoose.Types.ObjectId[],
): Promise<Map<string, MemberBalanceSummary>> {
  const memberMatch =
    memberIds && memberIds.length > 0 ? { memberId: { $in: memberIds } } : {};

  const [deposits, returns, pendingDep, pendingRet] = await Promise.all([
    DepositModel.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      { $match: { ...memberMatch, status: "APPROVED", isDeleted: false } },
      { $group: { _id: "$memberId", total: { $sum: "$amount" } } },
    ]),
    DepositReturnModel.aggregate<{
      _id: { memberId: mongoose.Types.ObjectId; returnType: string };
      total: number;
    }>([
      { $match: { ...memberMatch, status: "APPROVED", isDeleted: false } },
      {
        $group: {
          _id: { memberId: "$memberId", returnType: "$returnType" },
          total: { $sum: "$amount" },
        },
      },
    ]),
    DepositModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { ...memberMatch, status: "PENDING", isDeleted: false } },
      { $group: { _id: "$memberId", count: { $sum: 1 } } },
    ]),
    DepositReturnModel.aggregate<{
      _id: mongoose.Types.ObjectId;
      count: number;
    }>([
      { $match: { ...memberMatch, status: "PENDING", isDeleted: false } },
      { $group: { _id: "$memberId", count: { $sum: 1 } } },
    ]),
  ]);

  const map = new Map<string, MemberBalanceSummary>();

  const ensureEntry = (id: string) => {
    let entry = map.get(id);
    if (!entry) {
      entry = {
        totalDeposited: 0,
        totalReturned: 0,
        totalDonatedWaived: 0,
        netBalance: 0,
        pendingDepositsCount: 0,
        pendingReturnsCount: 0,
      };
      map.set(id, entry);
    }
    return entry;
  };

  for (const row of deposits) {
    ensureEntry(row._id.toString()).totalDeposited = roundMoney(row.total);
  }

  for (const row of returns) {
    const entry = ensureEntry(row._id.memberId.toString());
    entry.totalReturned = roundMoney(entry.totalReturned + row.total);
    if (row._id.returnType === "DONATED_WAIVER") {
      entry.totalDonatedWaived = roundMoney(
        entry.totalDonatedWaived + row.total,
      );
    }
  }

  for (const row of pendingDep) {
    ensureEntry(row._id.toString()).pendingDepositsCount = row.count;
  }

  for (const row of pendingRet) {
    ensureEntry(row._id.toString()).pendingReturnsCount = row.count;
  }

  for (const entry of map.values()) {
    entry.netBalance = roundMoney(entry.totalDeposited - entry.totalReturned);
  }

  return map;
}

/**
 * Computes live balances for all payment accounts (including soft-deleted accounts that still have historical transactions).
 */
export async function getAllAccountBalances(): Promise<
  Map<string, AccountBalanceSummary>
> {
  const [depAgg, retAgg, transferInAgg, transferOutAgg, chargeAgg] =
    await Promise.all([
      DepositModel.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
        { $match: { status: "APPROVED", isDeleted: false } },
        { $group: { _id: "$paymentAccountId", total: { $sum: "$amount" } } },
      ]),
      DepositReturnModel.aggregate<{
        _id: mongoose.Types.ObjectId;
        total: number;
      }>([
        {
          $match: {
            status: "APPROVED",
            isDeleted: false,
            returnType: { $ne: "DONATED_WAIVER" },
            paymentAccountId: { $ne: null },
          },
        },
        { $group: { _id: "$paymentAccountId", total: { $sum: "$amount" } } },
      ]),
      AccountTransferModel.aggregate<{
        _id: mongoose.Types.ObjectId;
        total: number;
      }>([
        { $match: { isDeleted: false } },
        { $group: { _id: "$toAccountId", total: { $sum: "$amount" } } },
      ]),
      AccountTransferModel.aggregate<{
        _id: mongoose.Types.ObjectId;
        totalAmount: number;
        totalFee: number;
      }>([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: "$fromAccountId",
            totalAmount: { $sum: "$amount" },
            totalFee: { $sum: "$transferFee" },
          },
        },
      ]),
      AccountChargeModel.aggregate<{
        _id: mongoose.Types.ObjectId;
        total: number;
      }>([
        { $match: { isDeleted: false } },
        { $group: { _id: "$paymentAccountId", total: { $sum: "$amount" } } },
      ]),
    ]);

  const map = new Map<string, AccountBalanceSummary>();
  const ensure = (id: string) => {
    let entry = map.get(id);
    if (!entry) {
      entry = {
        accountId: id,
        totalInDeposits: 0,
        totalOutReturns: 0,
        totalTransferIn: 0,
        totalTransferOut: 0,
        totalTransferFees: 0,
        totalStandaloneCharges: 0,
        balance: 0,
      };
      map.set(id, entry);
    }
    return entry;
  };

  for (const row of depAgg) {
    if (row._id) ensure(row._id.toString()).totalInDeposits = roundMoney(row.total);
  }
  for (const row of retAgg) {
    if (row._id) ensure(row._id.toString()).totalOutReturns = roundMoney(row.total);
  }
  for (const row of transferInAgg) {
    if (row._id) ensure(row._id.toString()).totalTransferIn = roundMoney(row.total);
  }
  for (const row of transferOutAgg) {
    if (row._id) {
      const entry = ensure(row._id.toString());
      entry.totalTransferOut = roundMoney(row.totalAmount);
      entry.totalTransferFees = roundMoney(row.totalFee);
    }
  }
  for (const row of chargeAgg) {
    if (row._id) {
      ensure(row._id.toString()).totalStandaloneCharges = roundMoney(row.total);
    }
  }

  for (const entry of map.values()) {
    entry.balance = computeSingleAccountBalance(entry);
  }

  return map;
}

/**
 * Computes live balance for a single payment account.
 */
export async function getAccountBalance(
  accountId: string | mongoose.Types.ObjectId,
): Promise<AccountBalanceSummary> {
  const id =
    typeof accountId === "string"
      ? toObjectId(accountId, "paymentAccountId").toString()
      : accountId.toString();

  const allBalances = await getAllAccountBalances();
  return (
    allBalances.get(id) ?? {
      accountId: id,
      totalInDeposits: 0,
      totalOutReturns: 0,
      totalTransferIn: 0,
      totalTransferOut: 0,
      totalTransferFees: 0,
      totalStandaloneCharges: 0,
      balance: 0,
    }
  );
}

/**
 * Single Source of Truth for Group Fund Reconciliation.
 * Accepts an optional precomputed account balances map to avoid duplicate DB aggregations.
 */
export async function getGroupFundSummary(
  precomputedAccountBalances?: Map<string, AccountBalanceSummary>,
): Promise<GroupFundSummary> {
  const [
    depositAgg,
    returnAgg,
    transferFeeAgg,
    chargeAgg,
    inactiveUsers,
    allAccounts,
    accountBalancesMap,
  ] = await Promise.all([
    DepositModel.aggregate<{ _id: null; total: number }>([
      { $match: { status: "APPROVED", isDeleted: false } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    DepositReturnModel.aggregate<{ _id: string; total: number }>([
      { $match: { status: "APPROVED", isDeleted: false } },
      { $group: { _id: "$returnType", total: { $sum: "$amount" } } },
    ]),
    AccountTransferModel.aggregate<{ _id: null; total: number }>([
      { $match: { isDeleted: false } },
      { $group: { _id: null, total: { $sum: "$transferFee" } } },
    ]),
    AccountChargeModel.aggregate<{ _id: null; total: number }>([
      { $match: { isDeleted: false } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    UserModel.find({
      $or: [{ status: "INACTIVE" }, { isDeleted: true }],
    })
      .select("_id")
      .lean(),
    PaymentAccountModel.find({}).select("_id").lean(),
    precomputedAccountBalances
      ? Promise.resolve(precomputedAccountBalances)
      : getAllAccountBalances(),
  ]);

  const totalApprovedDeposits = roundMoney(depositAgg[0]?.total || 0);
  let totalApprovedPayoutReturns = 0;
  let totalDonatedWaivers = 0;

  for (const row of returnAgg) {
    if (row._id === "DONATED_WAIVER") {
      totalDonatedWaivers = roundMoney(totalDonatedWaivers + row.total);
    } else {
      totalApprovedPayoutReturns = roundMoney(
        totalApprovedPayoutReturns + row.total,
      );
    }
  }

  const totalTransferFees = roundMoney(transferFeeAgg[0]?.total || 0);
  const totalStandaloneCharges = roundMoney(chargeAgg[0]?.total || 0);

  // Sum unsettled positive balances belonging to inactive/closed members
  const inactiveIds = inactiveUsers.map((u) => u._id);
  let unsettledFormerMemberPayable = 0;
  if (inactiveIds.length > 0) {
    const inactiveBalances = await getMemberBalancesMap(inactiveIds);
    for (const balance of inactiveBalances.values()) {
      if (balance.netBalance > 0) {
        unsettledFormerMemberPayable = roundMoney(
          unsettledFormerMemberPayable + balance.netBalance,
        );
      }
    }
  }

  // Sum all account balances (verify exact reconciliation)
  const seenAccountIds = new Set<string>(
    allAccounts.map((a) => a._id.toString()),
  );
  let accountBalancesSum = 0;
  for (const [accId, summary] of accountBalancesMap.entries()) {
    if (seenAccountIds.has(accId) || summary.balance !== 0) {
      accountBalancesSum = roundMoney(accountBalancesSum + summary.balance);
    }
  }

  const reconciled = computeFundReconciliation({
    totalApprovedDeposits,
    totalApprovedPayoutReturns,
    totalTransferFees,
    totalStandaloneCharges,
    unsettledFormerMemberPayable,
    accountBalancesSum,
  });

  return {
    totalApprovedDeposits,
    totalApprovedPayoutReturns,
    totalDonatedWaivers,
    totalTransferFees,
    totalStandaloneCharges,
    totalCharges: reconciled.totalCharges,
    totalCashInHand: reconciled.totalCashInHand,
    unsettledFormerMemberPayable,
    activeNetFund: reconciled.activeNetFund,
    accountBalancesSum,
    reconciliationDifference: reconciled.reconciliationDifference,
  };
}
