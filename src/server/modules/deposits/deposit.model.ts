import {
  ENTRY_SOURCES,
  EntrySource,
  PAYMENT_METHODS,
  PaymentMethodType,
  TRANSACTION_STATUSES,
  TransactionStatus,
} from "@/types/backend";
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IDepositDocument extends Document {
  memberId: mongoose.Types.ObjectId;
  amount: number;
  month: string; // YYYY-MM
  depositDate: Date;
  paymentMethod: PaymentMethodType;
  paymentAccountId: mongoose.Types.ObjectId;
  trxId?: string;
  proofImage?: string;
  note?: string;
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

const depositSchema = new Schema<IDepositDocument>(
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
    month: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
      trim: true,
    },
    depositDate: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
    },
    paymentAccountId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentAccount",
      required: true,
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
    note: {
      type: String,
      trim: true,
      default: "",
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

depositSchema.index({ memberId: 1, status: 1, isDeleted: 1 });
depositSchema.index({ month: 1, status: 1, isDeleted: 1 });
depositSchema.index({ paymentAccountId: 1, status: 1, isDeleted: 1 });
depositSchema.index({ trxId: 1 }, { sparse: true });
depositSchema.index({ depositDate: -1 });

export const DepositModel: Model<IDepositDocument> =
  mongoose.models.Deposit ||
  mongoose.model<IDepositDocument>("Deposit", depositSchema);
