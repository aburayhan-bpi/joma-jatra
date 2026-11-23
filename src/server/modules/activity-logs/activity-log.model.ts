import {
  ACTIVITY_ACTIONS,
  ACTIVITY_ENTITIES,
  ActivityAction,
  ActivityEntity,
} from "@/types/backend";
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IActivityLogDocument extends Document {
  entityType: ActivityEntity;
  entityId?: mongoose.Types.ObjectId | null;
  targetMemberId?: mongoose.Types.ObjectId | null;
  action: ActivityAction;
  summary: string;
  amount?: number | null;
  proofImage?: string | null;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  } | null;
  performedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const activityLogSchema = new Schema<IActivityLogDocument>(
  {
    entityType: {
      type: String,
      enum: ACTIVITY_ENTITIES,
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    targetMemberId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    action: {
      type: String,
      enum: ACTIVITY_ACTIONS,
      required: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      default: null,
    },
    proofImage: {
      type: String,
      default: null,
    },
    changes: {
      type: Schema.Types.Mixed,
      default: null,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

activityLogSchema.index({ targetMemberId: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

export const ActivityLogModel: Model<IActivityLogDocument> =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLogDocument>("ActivityLog", activityLogSchema);
