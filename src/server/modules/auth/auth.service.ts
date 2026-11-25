import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
  badRequest,
  conflict,
  notFound,
  tooManyRequests,
  unauthorized,
} from "../../core/app-error";
import {
  AuthUser,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../core/auth-guard";
import { connectDB } from "../../core/db";
import { serverEnv } from "../../core/env";
import { getMemberBalance } from "../../shared/accounting.service";
import { roundMoney } from "../../shared/normalize";
import { sendEmail } from "../../shared/email";
import { buildPasswordResetOtpEmail } from "../../shared/email-templates";
import { logActivity } from "../activity-logs/activity-log.service";
import { IUserDocument, UserModel } from "../members/user.model";

function formatAuthUser(user: IUserDocument) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    profileImage: user.profileImage || "",
    role: user.role,
    status: user.status,
    joinedAt: user.joinedAt,
    mustChangePassword: user.mustChangePassword,
  };
}

function issueTokens(user: IUserDocument) {
  const payload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion ?? 0,
  };

  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

/**
 * Increments tokenVersion on the user so all existing JWT access & refresh tokens are revoked server-side.
 */
export async function revokeUserSessions(userId: string) {
  await connectDB();
  await UserModel.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
}

/**
 * Creates the very first ADMIN user when the database has zero users.
 */
export async function bootstrapAdmin(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}) {
  await connectDB();

  const existingUsersCount = await UserModel.countDocuments({});
  if (existingUsersCount > 0) {
    throw conflict(
      "System is already initialized. Please log in with an existing Admin account.",
    );
  }

  const admin = await UserModel.create({
    name: input.name,
    email: input.email.toLowerCase(),
    phone: input.phone || "",
    password: input.password,
    role: "ADMIN",
    status: "ACTIVE",
    joinedAt: new Date(),
    mustChangePassword: false,
  });

  await logActivity({
    entityType: "USER",
    entityId: admin._id,
    targetMemberId: admin._id,
    action: "CREATED",
    summary: `Initial Admin account created for ${admin.name}`,
    performedBy: admin._id,
  });

  const tokens = issueTokens(admin);
  return {
    ...tokens,
    user: formatAuthUser(admin),
  };
}

/**
 * Authenticates an active user with email and password.
 */
export async function loginUser(input: { email: string; password: string }) {
  await connectDB();

  const user = await UserModel.findOne({
    email: input.email.toLowerCase(),
  }).select("+password");

  if (!user) {
    throw unauthorized("Invalid email or password");
  }

  if (user.isDeleted || user.status !== "ACTIVE") {
    throw unauthorized(
      "This account has been deactivated. Contact the group Admin.",
    );
  }

  const isMatch = await user.comparePassword(input.password);
  if (!isMatch) {
    throw unauthorized("Invalid email or password");
  }

  await logActivity({
    entityType: "AUTH",
    entityId: user._id,
    targetMemberId: user._id,
    action: "LOGIN",
    summary: `${user.name} logged in`,
    performedBy: user._id,
  });

  const tokens = issueTokens(user);
  return {
    ...tokens,
    user: formatAuthUser(user),
  };
}

/**
 * Refreshes access & refresh tokens after verifying live user status.
 */
export async function refreshAuthTokens(refreshToken: string) {
  await connectDB();

  const decoded = verifyRefreshToken(refreshToken);
  const user = await UserModel.findById(decoded.userId);

  if (!user || user.isDeleted || user.status !== "ACTIVE") {
    throw unauthorized("Your account is no longer active");
  }

  if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
    throw unauthorized("Session has been revoked. Please log in again.");
  }

  const tokens = issueTokens(user);
  return {
    ...tokens,
    user: formatAuthUser(user),
  };
}

/**
 * Returns the authenticated user profile along with live personal savings balance
 * and private personal monthly goal.
 */
export async function getAuthenticatedProfile(authUser: AuthUser) {
  const [balance, privateFields] = await Promise.all([
    getMemberBalance(authUser.id),
    UserModel.findById(authUser.id).select("+personalMonthlyGoal").lean(),
  ]);

  return {
    ...formatAuthUser(authUser.doc),
    personalMonthlyGoal: roundMoney(privateFields?.personalMonthlyGoal || 0),
    financialSummary: balance,
  };
}

/**
 * Allows an authenticated user to update their own name, phone, profileImage,
 * or private personalMonthlyGoal (never logged to public group Activity Logs).
 */
export async function updateAuthenticatedProfile(
  authUser: AuthUser,
  input: {
    name?: string;
    phone?: string;
    profileImage?: string;
    personalMonthlyGoal?: number;
  },
) {
  await connectDB();

  const user = await UserModel.findById(authUser.id).select(
    "+personalMonthlyGoal",
  );
  if (!user || user.isDeleted || user.status !== "ACTIVE") {
    throw notFound("Active user account not found");
  }

  const before = {
    name: user.name,
    phone: user.phone || "",
    profileImage: user.profileImage || "",
  };

  let publicProfileChanged = false;
  if (input.name !== undefined && input.name !== user.name) {
    user.name = input.name;
    publicProfileChanged = true;
  }
  if (input.phone !== undefined && input.phone !== (user.phone || "")) {
    user.phone = input.phone;
    publicProfileChanged = true;
  }
  if (
    input.profileImage !== undefined &&
    input.profileImage !== (user.profileImage || "")
  ) {
    user.profileImage = input.profileImage;
    publicProfileChanged = true;
  }
  if (input.personalMonthlyGoal !== undefined) {
    user.personalMonthlyGoal = roundMoney(input.personalMonthlyGoal);
  }
  await user.save();

  // Only log public profile changes so private personalMonthlyGoal stays 100% private
  if (publicProfileChanged) {
    await logActivity({
      entityType: "USER",
      entityId: user._id,
      targetMemberId: user._id,
      action: "UPDATED",
      summary: `${user.name} updated their own profile`,
      changes: {
        before,
        after: {
          name: user.name,
          phone: user.phone || "",
          profileImage: user.profileImage || "",
        },
      },
      performedBy: user._id,
    });
  }

  const balance = await getMemberBalance(user._id);
  return {
    ...formatAuthUser(user),
    personalMonthlyGoal: roundMoney(user.personalMonthlyGoal || 0),
    financialSummary: balance,
  };
}

/**
 * Allows an authenticated user to change their password.
 */
export async function changeUserPassword(
  authUser: AuthUser,
  input: { currentPassword: string; newPassword: string },
) {
  await connectDB();

  const user = await UserModel.findById(authUser.id).select("+password");
  if (!user) {
    throw notFound("User account not found");
  }

  const isMatch = await user.comparePassword(input.currentPassword);
  if (!isMatch) {
    throw badRequest("Current password is incorrect");
  }

  user.password = input.newPassword;
  user.mustChangePassword = false;
  // Bump tokenVersion to invalidate all other sessions, then issue fresh tokens for current caller
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  await logActivity({
    entityType: "AUTH",
    entityId: user._id,
    targetMemberId: user._id,
    action: "PASSWORD_CHANGED",
    summary: `${user.name} updated their password`,
    performedBy: user._id,
  });

  const tokens = issueTokens(user);
  return {
    updated: true,
    ...tokens,
  };
}

const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_VERIFY_ATTEMPTS = 5;

/**
 * Generates a 6-digit password reset OTP and emails it to an active user.
 */
export async function requestForgotPasswordOtp(email: string) {
  await connectDB();

  const user = await UserModel.findOne({
    email: email.toLowerCase(),
    isDeleted: false,
    status: "ACTIVE",
  }).select("+resetOtp +resetOtpExpires +resetOtpAttempts +resetOtpSentAt +resetTokenId");

  // Always return a generic success response to prevent email enumeration
  if (!user) {
    return { sent: true };
  }

  // Enforce a 60-second resend cooldown per account to protect SMTP quota
  if (
    user.resetOtpSentAt &&
    Date.now() - user.resetOtpSentAt.getTime() < OTP_RESEND_COOLDOWN_MS
  ) {
    const waitSec = Math.max(
      1,
      Math.ceil(
        (OTP_RESEND_COOLDOWN_MS - (Date.now() - user.resetOtpSentAt.getTime())) /
          1000,
      ),
    );
    throw tooManyRequests(
      `Please wait ${waitSec} second(s) before requesting another verification code.`,
    );
  }

  // crypto.randomInt upper bound is exclusive, so 1000000 covers full 100000..999999
  const otp = String(crypto.randomInt(100000, 1000000));
  const salt = await bcrypt.genSalt(8);
  user.resetOtp = await bcrypt.hash(otp, salt);
  user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
  user.resetOtpAttempts = 0;
  user.resetOtpSentAt = new Date();
  user.resetTokenId = null;
  await user.save();

  const otpEmail = buildPasswordResetOtpEmail({
    name: user.name,
    otp,
    expiresInMinutes: 10,
  });

  await sendEmail({
    to: user.email,
    ...otpEmail,
  });

  return { sent: true };
}

/**
 * Verifies forgot-password OTP and issues a short-lived, single-use password reset token.
 */
export async function verifyForgotPasswordOtp(email: string, otp: string) {
  await connectDB();

  const user = await UserModel.findOne({
    email: email.toLowerCase(),
    isDeleted: false,
    status: "ACTIVE",
  }).select("+resetOtp +resetOtpExpires +resetOtpAttempts +resetTokenId");

  if (!user || !user.resetOtp || !user.resetOtpExpires) {
    throw badRequest("Invalid or expired verification code");
  }

  if (user.resetOtpExpires.getTime() < Date.now()) {
    throw badRequest("Verification code has expired. Please request a new one.");
  }

  const isValid = await bcrypt.compare(otp, user.resetOtp);
  if (!isValid) {
    const attempts = (user.resetOtpAttempts ?? 0) + 1;
    if (attempts >= MAX_OTP_VERIFY_ATTEMPTS) {
      // Invalidate OTP after too many wrong guesses to stop brute-force attacks
      user.resetOtp = null;
      user.resetOtpExpires = null;
      user.resetOtpAttempts = 0;
      user.resetTokenId = null;
      await user.save();
      throw tooManyRequests(
        "Too many invalid attempts. This verification code has been invalidated — please request a new one.",
      );
    }
    user.resetOtpAttempts = attempts;
    await user.save();
    throw badRequest("Invalid verification code");
  }

  // Clear OTP so it cannot be re-verified, bind reset JWT to a one-time nonce, and align expiry to 15m
  const resetTokenId = crypto.randomBytes(16).toString("hex");
  user.resetOtp = null;
  user.resetTokenId = resetTokenId;
  user.resetOtpExpires = new Date(Date.now() + 15 * 60 * 1000);
  user.resetOtpAttempts = 0;
  await user.save();

  const resetToken = jwt.sign(
    {
      userId: user._id.toString(),
      purpose: "PASSWORD_RESET",
      jti: resetTokenId,
    },
    serverEnv.jwtAccessSecret,
    { expiresIn: "15m" },
  );

  return { resetToken };
}

/**
 * Resets password using a verified short-lived single-use reset token.
 */
export async function resetUserPassword(
  resetToken: string,
  newPassword: string,
) {
  await connectDB();

  let decoded: { userId: string; purpose?: string; jti?: string };
  try {
    decoded = jwt.verify(resetToken, serverEnv.jwtAccessSecret) as {
      userId: string;
      purpose?: string;
      jti?: string;
    };
  } catch {
    throw unauthorized("Reset token is invalid or expired");
  }

  if (decoded.purpose !== "PASSWORD_RESET" || !decoded.jti) {
    throw unauthorized("Invalid reset token purpose");
  }

  // Atomically consume the one-time resetTokenId so concurrent replays cannot succeed
  const user = await UserModel.findOneAndUpdate(
    {
      _id: decoded.userId,
      isDeleted: false,
      status: "ACTIVE",
      resetTokenId: decoded.jti,
      resetOtpExpires: { $gt: new Date() },
    },
    {
      $set: {
        resetOtp: null,
        resetOtpExpires: null,
        resetOtpAttempts: 0,
        resetTokenId: null,
      },
    },
    { new: true },
  ).select("+password");

  if (!user) {
    throw unauthorized("Reset token has already been used or expired");
  }

  user.password = newPassword;
  user.mustChangePassword = false;
  // Invalidate all previous sessions across devices upon password reset
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  await logActivity({
    entityType: "AUTH",
    entityId: user._id,
    targetMemberId: user._id,
    action: "PASSWORD_CHANGED",
    summary: `${user.name} reset their password via verification code`,
    performedBy: user._id,
  });

  return { reset: true };
}
