import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAccountChargeDocument extends Document {
  paymentAccountId: mongoose.Types.ObjectId;
  amount: number;
  chargeDate: Date;
  title: string;
  proofImage?: string;
  note?: string;
  createdBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const accountChargeSchema = new Schema<IAccountChargeDocument>(
  {
    paymentAccountId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentAccount",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    chargeDate: {
      type: Date,
      default: Date.now,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
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
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

accountChargeSchema.index({ paymentAccountId: 1, isDeleted: 1 });
accountChargeSchema.index({ chargeDate: -1 });

export const AccountChargeModel: Model<IAccountChargeDocument> =
  mongoose.models.AccountCharge ||
  mongoose.model<IAccountChargeDocument>("AccountCharge", accountChargeSchema);
