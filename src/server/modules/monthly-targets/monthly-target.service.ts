import { AuthUser } from "../../core/auth-guard";
import { connectDB } from "../../core/db";
import { roundMoney, toObjectId } from "../../shared/normalize";
import {
  buildPaginationMeta,
  buildSearchFilter,
  PaginationQuery,
} from "../../shared/pagination";
import { logActivity } from "../activity-logs/activity-log.service";
import { DepositModel } from "../deposits/deposit.model";
import { MonthlyTargetModel } from "./monthly-target.model";

/**
 * Lists monthly targets with URL pagination, search, and live collected progress.
 */
export async function listMonthlyTargets(pagination: PaginationQuery) {
  await connectDB();

  const filter = buildSearchFilter(pagination.search, ["month", "note"]);

  const [targets, total] = await Promise.all([
    MonthlyTargetModel.find(filter)
      .sort({ month: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("updatedBy", "name email role")
      .lean(),
    MonthlyTargetModel.countDocuments(filter),
  ]);

  const months = targets.map((t) => t.month);
  const collectedAgg =
    months.length > 0
      ? await DepositModel.aggregate<{
          _id: string;
          collectedAmount: number;
          depositCount: number;
        }>([
          {
            $match: {
              month: { $in: months },
              status: "APPROVED",
              isDeleted: false,
            },
          },
          {
            $group: {
              _id: "$month",
              collectedAmount: { $sum: "$amount" },
              depositCount: { $sum: 1 },
            },
          },
        ])
      : [];

  const collectedMap = new Map(collectedAgg.map((row) => [row._id, row]));

  const items = targets.map((target) => {
    const stats = collectedMap.get(target.month);
    const collectedAmount = roundMoney(stats?.collectedAmount || 0);
    const remainingAmount = roundMoney(
      Math.max(0, target.targetAmount - collectedAmount),
    );
    const progressPercent =
      target.targetAmount > 0
        ? Math.round((collectedAmount / target.targetAmount) * 100)
        : 0;

    return {
      ...target,
      id: target._id.toString(),
      collectedAmount,
      depositCount: stats?.depositCount || 0,
      remainingAmount,
      progressPercent,
    };
  });

  return {
    items,
    meta: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
}

/**
 * Fetches a single month's target and live collected total (works even if no target is configured yet).
 */
export async function getMonthlyTargetByMonth(month: string) {
  await connectDB();

  const [target, collectedAgg] = await Promise.all([
    MonthlyTargetModel.findOne({ month })
      .populate("updatedBy", "name email role")
      .lean(),
    DepositModel.aggregate<{
      _id: null;
      collectedAmount: number;
      depositCount: number;
    }>([
      { $match: { month, status: "APPROVED", isDeleted: false } },
      {
        $group: {
          _id: null,
          collectedAmount: { $sum: "$amount" },
          depositCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  const targetAmount = target?.targetAmount || 0;
  const collectedAmount = roundMoney(collectedAgg[0]?.collectedAmount || 0);
  const depositCount = collectedAgg[0]?.depositCount || 0;
  const remainingAmount = roundMoney(
    Math.max(0, targetAmount - collectedAmount),
  );
  const progressPercent =
    targetAmount > 0 ? Math.round((collectedAmount / targetAmount) * 100) : 0;

  return {
    id: target?._id?.toString() || null,
    month,
    hasTarget: Boolean(target),
    targetAmount,
    note: target?.note || "",
    updatedBy: target?.updatedBy || null,
    updatedAt: target?.updatedAt || null,
    collectedAmount,
    depositCount,
    remainingAmount,
    progressPercent,
  };
}

/**
 * Admin or Cashier creates or updates the editable group target for a given YYYY-MM month.
 */
export async function upsertMonthlyTarget(
  actor: AuthUser,
  input: { month: string; targetAmount: number; note?: string },
) {
  await connectDB();

  const actorObjectId = toObjectId(actor.id, "actorId");
  const existing = await MonthlyTargetModel.findOne({ month: input.month });

  if (!existing) {
    const created = await MonthlyTargetModel.create({
      month: input.month,
      targetAmount: input.targetAmount,
      note: input.note || "",
      createdBy: actorObjectId,
      updatedBy: actorObjectId,
    });

    await logActivity({
      entityType: "MONTHLY_TARGET",
      entityId: created._id,
      action: "CREATED",
      summary: `${actor.name} set monthly target for ${input.month} to ৳${input.targetAmount}`,
      amount: input.targetAmount,
      performedBy: actor.id,
    });

    return getMonthlyTargetByMonth(input.month);
  }

  const before = {
    targetAmount: existing.targetAmount,
    note: existing.note,
  };

  existing.targetAmount = input.targetAmount;
  if (input.note !== undefined) existing.note = input.note;
  existing.updatedBy = actorObjectId;
  await existing.save();

  await logActivity({
    entityType: "MONTHLY_TARGET",
    entityId: existing._id,
    action: "UPDATED",
    summary: `${actor.name} updated ${input.month} target from ৳${before.targetAmount} to ৳${existing.targetAmount}`,
    amount: existing.targetAmount,
    changes: {
      before,
      after: {
        targetAmount: existing.targetAmount,
        note: existing.note,
      },
    },
    performedBy: actor.id,
  });

  return getMonthlyTargetByMonth(input.month);
}
