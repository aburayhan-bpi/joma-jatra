import {
  ENTRY_SOURCES,
  EntrySource,
  PAYMENT_METHODS,
  PaymentMethodType,
  RETURN_TYPES,
  ReturnType,
  TRANSACTION_STATUSES,
  TransactionStatus,
} from "@/types/backend";
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IDepositReturnDocument extends Document {
  memberId: mongoose.Types.ObjectId;
  amount: number;
  payoutFee: number;
  returnDate: Date;
  paymentMethod?: PaymentMethodType | null;
  paymentAccountId?: mongoose.Types.ObjectId | null;
  recipientAccount?: string;
  trxId?: string;
  proofImage?: string;
  reason?: string;
  returnType: ReturnType;
  entrySource: EntrySource;
  status: TransactionStatus;
  rejectionReason?: string | null;
  createdBy: mongoose.Types.ObjectId;
  reviewedBy?: mongoose.Types.ObjectId | null;
  reviewedAt?: Date | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const depositReturnSchema = new Schema<IDepositReturnDocument>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    payoutFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    returnDate: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: [...PAYMENT_METHODS, null],
      default: null,
    },
    paymentAccountId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentAccount",
      default: null,
    },
    recipientAccount: {
      type: String,
      trim: true,
      default: "",
    },
    trxId: {
      type: String,
      trim: true,
      uppercase: true,
      default: undefined,
    },
    proofImage: {
      type: String,
      trim: true,
      default: "",
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
    returnType: {
      type: String,
      enum: RETURN_TYPES,
      default: "PARTIAL",
    },
    entrySource: {
      type: String,
      enum: ENTRY_SOURCES,
      default: "MEMBER_REQUEST",
    },
    status: {
      type: String,
      enum: TRANSACTION_STATUSES,
      default: "PENDING",
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
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

depositReturnSchema.index({ memberId: 1, status: 1, isDeleted: 1 });
depositReturnSchema.index({ paymentAccountId: 1, status: 1, isDeleted: 1 });
depositReturnSchema.index({ returnDate: -1 });

// Refresh cached Mongoose model during Next.js dev hot-reload if schema gained new fields
if (
  mongoose.models.DepositReturn &&
  !mongoose.models.DepositReturn.schema.path("payoutFee")
) {
  mongoose.deleteModel("DepositReturn");
}

export const DepositReturnModel: Model<IDepositReturnDocument> =
  mongoose.models.DepositReturn ||
  mongoose.model<IDepositReturnDocument>("DepositReturn", depositReturnSchema);
