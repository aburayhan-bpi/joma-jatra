import {
  TRANSFER_FEE_BEARER_TYPES,
  TransferFeeBearerType,
} from "@/types/backend";
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAccountTransferDocument extends Document {
  fromAccountId: mongoose.Types.ObjectId;
  toAccountId: mongoose.Types.ObjectId;
  amount: number;
  transferFee: number;
  feeBearerType: TransferFeeBearerType;
  feeBearerMemberId?: mongoose.Types.ObjectId | null;
  transferDate: Date;
  trxId?: string;
  proofImage?: string;
  note?: string;
  createdBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const accountTransferSchema = new Schema<IAccountTransferDocument>(
  {
    fromAccountId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentAccount",
      required: true,
    },
    toAccountId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentAccount",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    transferFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    feeBearerType: {
      type: String,
      enum: TRANSFER_FEE_BEARER_TYPES,
      default: "SHARED_PRO_RATA",
    },
    feeBearerMemberId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    transferDate: {
      type: Date,
      default: Date.now,
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

accountTransferSchema.index({ fromAccountId: 1, isDeleted: 1 });
accountTransferSchema.index({ toAccountId: 1, isDeleted: 1 });
accountTransferSchema.index({ transferDate: -1 });

// Refresh cached Mongoose schema cleanly under Next.js HMR in dev
const existingModel = mongoose.models.AccountTransfer as
  | Model<IAccountTransferDocument>
  | undefined;
if (existingModel && !existingModel.schema.path("feeBearerType")) {
  mongoose.deleteModel("AccountTransfer");
}

export const AccountTransferModel: Model<IAccountTransferDocument> =
  mongoose.models.AccountTransfer ||
  mongoose.model<IAccountTransferDocument>(
    "AccountTransfer",
    accountTransferSchema,
  );
