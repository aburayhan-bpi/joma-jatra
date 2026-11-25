import {
  DEFAULT_USER_ROLE,
  DEFAULT_USER_STATUS,
  USER_ROLES,
  USER_STATUSES,
  UserRole,
  UserStatus,
} from "@/types/backend";
import bcrypt from "bcryptjs";
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUserDocument extends Document {
  name: string;
  email: string;
  phone?: string;
  password: string;
  profileImage?: string;
  role: UserRole;
  status: UserStatus;
  joinedAt: Date;
  leftAt?: Date | null;
  leaveNote?: string | null;
  mustChangePassword: boolean;
  personalMonthlyGoal?: number;
  tokenVersion: number;
  resetOtp?: string | null;
  resetOtpExpires?: Date | null;
  resetOtpAttempts?: number;
  resetOtpSentAt?: Date | null;
  resetTokenId?: string | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    profileImage: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: DEFAULT_USER_ROLE,
    },
    status: {
      type: String,
      enum: USER_STATUSES,
      default: DEFAULT_USER_STATUS,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
      default: null,
    },
    leaveNote: {
      type: String,
      trim: true,
      default: null,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    // Strictly private to the user — excluded from all default/member queries
    personalMonthlyGoal: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },
    // Incremented on logout / password change / reset to immediately revoke old JWTs
    tokenVersion: {
      type: Number,
      default: 0,
    },
    resetOtp: {
      type: String,
      select: false,
      default: null,
    },
    resetOtpExpires: {
      type: Date,
      select: false,
      default: null,
    },
    resetOtpAttempts: {
      type: Number,
      select: false,
      default: 0,
    },
    resetOtpSentAt: {
      type: Date,
      select: false,
      default: null,
    },
    resetTokenId: {
      type: String,
      select: false,
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
    createdBy: {
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

userSchema.index({ role: 1, status: 1, isDeleted: 1 });
userSchema.index({ joinedAt: 1 });

// Hash password automatically before saving when modified
userSchema.pre("save", async function hashPasswordIfModified() {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function comparePassword(
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Refresh cached Mongoose model during Next.js dev hot-reload if schema gained new fields
if (
  mongoose.models.User &&
  (!mongoose.models.User.schema.path("personalMonthlyGoal") ||
    !mongoose.models.User.schema.path("tokenVersion") ||
    !mongoose.models.User.schema.path("resetOtpAttempts") ||
    !mongoose.models.User.schema.path("resetTokenId"))
) {
  mongoose.deleteModel("User");
}

export const UserModel: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>("User", userSchema);
