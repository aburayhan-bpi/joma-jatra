import { ActivityAction, ActivityEntity } from "@/types/backend";
import mongoose from "mongoose";
import { connectDB } from "../../core/db";
import {
  buildPaginationMeta,
  buildSearchFilter,
  PaginationQuery,
} from "../../shared/pagination";
import { toObjectId } from "../../shared/normalize";
import { ActivityLogModel } from "./activity-log.model";

export interface LogActivityInput {
  entityType: ActivityEntity;
  entityId?: string | mongoose.Types.ObjectId | null;
  targetMemberId?: string | mongoose.Types.ObjectId | null;
  action: ActivityAction;
  summary: string;
  amount?: number | null;
  proofImage?: string | null;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  } | null;
  performedBy: string | mongoose.Types.ObjectId;
}

/**
 * Persists an audit trail entry for financial or member lifecycle actions.
 */
export async function logActivity(input: LogActivityInput) {
  return ActivityLogModel.create({
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    targetMemberId: input.targetMemberId ?? null,
    action: input.action,
    summary: input.summary,
    amount: input.amount ?? null,
    proofImage: input.proofImage || null,
    changes: input.changes ?? null,
    performedBy: input.performedBy,
  });
}

export interface ListActivityLogsParams {
  pagination: PaginationQuery;
  entityType?: string;
  action?: string;
  targetMemberId?: string;
}

/**
 * Fetches paginated global or member-scoped audit logs.
 */
export async function listActivityLogs({
  pagination,
  entityType,
  action,
  targetMemberId,
}: ListActivityLogsParams) {
  await connectDB();

  const filter: Record<string, unknown> = {
    ...buildSearchFilter(pagination.search, ["summary"]),
  };

  if (entityType) filter.entityType = entityType;
  if (action) filter.action = action;
  if (targetMemberId) {
    filter.targetMemberId = toObjectId(targetMemberId, "memberId");
  }

  const [items, total] = await Promise.all([
    ActivityLogModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("performedBy", "name email role")
      .populate("targetMemberId", "name email role status")
      .lean(),
    ActivityLogModel.countDocuments(filter),
  ]);

  return {
    items: items.map((item) => ({ ...item, id: item._id.toString() })),
    meta: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
}
