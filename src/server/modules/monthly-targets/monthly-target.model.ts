import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMonthlyTargetDocument extends Document {
  month: string; // YYYY-MM
  targetAmount: number;
  note?: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const monthlyTargetSchema = new Schema<IMonthlyTargetDocument>(
  {
    month: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
      trim: true,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 0,
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
    updatedBy: {
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

export const MonthlyTargetModel: Model<IMonthlyTargetDocument> =
  mongoose.models.MonthlyTarget ||
  mongoose.model<IMonthlyTargetDocument>("MonthlyTarget", monthlyTargetSchema);
