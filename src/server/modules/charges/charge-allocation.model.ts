import {
  CHARGE_ALLOCATION_MODES,
  CHARGE_ALLOCATION_SOURCES,
  ChargeAllocationMode,
  ChargeAllocationSource,
} from "@/types/backend";
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IChargeAllocationDocument extends Document {
  sourceType: ChargeAllocationSource;
  sourceId: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  allocationMode: ChargeAllocationMode;
  title: string;
  chargeDate: Date;
  totalChargeAmount: number;
  memberBalanceSnapshot: number;
  eligibleTotalSnapshot: number;
  sharePercent: number;
  allocatedAmount: number;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const chargeAllocationSchema = new Schema<IChargeAllocationDocument>(
  {
    sourceType: {
      type: String,
      enum: CHARGE_ALLOCATION_SOURCES,
      required: true,
    },
    sourceId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    allocationMode: {
      type: String,
      enum: CHARGE_ALLOCATION_MODES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    chargeDate: {
      type: Date,
      default: Date.now,
    },
    totalChargeAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    memberBalanceSnapshot: {
      type: Number,
      required: true,
      min: 0,
    },
    eligibleTotalSnapshot: {
      type: Number,
      required: true,
      min: 0,
    },
    sharePercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    allocatedAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

chargeAllocationSchema.index({ memberId: 1, isDeleted: 1, chargeDate: -1 });
chargeAllocationSchema.index({ sourceType: 1, sourceId: 1, isDeleted: 1 });

// Refresh cached Mongoose schema cleanly under Next.js HMR in dev
const existingModel = mongoose.models.ChargeAllocation as
  | Model<IChargeAllocationDocument>
  | undefined;
if (existingModel && !existingModel.schema.path("allocationMode")) {
  mongoose.deleteModel("ChargeAllocation");
}

export const ChargeAllocationModel: Model<IChargeAllocationDocument> =
  mongoose.models.ChargeAllocation ||
  mongoose.model<IChargeAllocationDocument>(
    "ChargeAllocation",
    chargeAllocationSchema,
  );
