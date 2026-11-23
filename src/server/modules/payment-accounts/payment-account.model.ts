import {
  PAYMENT_ACCOUNT_TYPES,
  PAYMENT_METHODS,
  PaymentAccountType,
  PaymentMethodType,
} from "@/types/backend";
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPaymentAccountDocument extends Document {
  method: PaymentMethodType;
  accountName: string;
  accountNumber: string;
  accountType: PaymentAccountType;
  bankName?: string;
  branchName?: string;
  routingNumber?: string;
  note?: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paymentAccountSchema = new Schema<IPaymentAccountDocument>(
  {
    method: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    accountNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    accountType: {
      type: String,
      enum: PAYMENT_ACCOUNT_TYPES,
      default: "PERSONAL",
    },
    bankName: {
      type: String,
      trim: true,
      default: "",
    },
    branchName: {
      type: String,
      trim: true,
      default: "",
    },
    routingNumber: {
      type: String,
      trim: true,
      default: "",
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
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
    createdBy: {
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

paymentAccountSchema.index({ method: 1, isActive: 1, isDeleted: 1 });

export const PaymentAccountModel: Model<IPaymentAccountDocument> =
  mongoose.models.PaymentAccount ||
  mongoose.model<IPaymentAccountDocument>(
    "PaymentAccount",
    paymentAccountSchema,
  );
