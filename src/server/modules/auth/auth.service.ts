import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
  badRequest,
  conflict,
  notFound,
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
  };

  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
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

  const tokens = issueTokens(user);
  return {
    ...tokens,
    user: formatAuthUser(user),
  };
}

/**
 * Returns the authenticated user profile along with live personal savings balance.
 */
export async function getAuthenticatedProfile(authUser: AuthUser) {
  const balance = await getMemberBalance(authUser.id);
  return {
    ...formatAuthUser(authUser.doc),
    financialSummary: balance,
  };
}

/**
 * Allows an authenticated user to update their own name, phone, or profileImage.
 */
export async function updateAuthenticatedProfile(
  authUser: AuthUser,
  input: { name?: string; phone?: string; profileImage?: string },
) {
  await connectDB();

  const user = await UserModel.findById(authUser.id);
  if (!user || user.isDeleted || user.status !== "ACTIVE") {
    throw notFound("Active user account not found");
  }

  const before = {
    name: user.name,
    phone: user.phone || "",
    profileImage: user.profileImage || "",
  };

  if (input.name !== undefined) user.name = input.name;
  if (input.phone !== undefined) user.phone = input.phone;
  if (input.profileImage !== undefined) user.profileImage = input.profileImage;
  await user.save();

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

  const balance = await getMemberBalance(user._id);
  return {
    ...formatAuthUser(user),
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
  await user.save();

  await logActivity({
    entityType: "AUTH",
    entityId: user._id,
    targetMemberId: user._id,
    action: "PASSWORD_CHANGED",
    summary: `${user.name} updated their password`,
    performedBy: user._id,
  });

  return { updated: true };
}

/**
 * Generates a 6-digit password reset OTP and emails it to an active user.
 */
export async function requestForgotPasswordOtp(email: string) {
  await connectDB();

  const user = await UserModel.findOne({
    email: email.toLowerCase(),
    isDeleted: false,
    status: "ACTIVE",
  }).select("+resetOtp +resetOtpExpires");

  // Always return a generic success response to prevent email enumeration
  if (!user) {
    return { sent: true };
  }

  const otp = String(crypto.randomInt(100000, 999999));
  const salt = await bcrypt.genSalt(8);
  user.resetOtp = await bcrypt.hash(otp, salt);
  user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
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
 * Verifies forgot-password OTP and issues a short-lived password reset token.
 */
export async function verifyForgotPasswordOtp(email: string, otp: string) {
  await connectDB();

  const user = await UserModel.findOne({
    email: email.toLowerCase(),
    isDeleted: false,
    status: "ACTIVE",
  }).select("+resetOtp +resetOtpExpires");

  if (!user || !user.resetOtp || !user.resetOtpExpires) {
    throw badRequest("Invalid or expired verification code");
  }

  if (user.resetOtpExpires.getTime() < Date.now()) {
    throw badRequest("Verification code has expired. Please request a new one.");
  }

  const isValid = await bcrypt.compare(otp, user.resetOtp);
  if (!isValid) {
    throw badRequest("Invalid verification code");
  }

  const resetToken = jwt.sign(
    { userId: user._id.toString(), purpose: "PASSWORD_RESET" },
    serverEnv.jwtAccessSecret,
    { expiresIn: "15m" },
  );

  return { resetToken };
}

/**
 * Resets password using a verified short-lived reset token.
 */
export async function resetUserPassword(
  resetToken: string,
  newPassword: string,
) {
  await connectDB();

  let decoded: { userId: string; purpose?: string };
  try {
    decoded = jwt.verify(resetToken, serverEnv.jwtAccessSecret) as {
      userId: string;
      purpose?: string;
    };
  } catch {
    throw unauthorized("Reset token is invalid or expired");
  }

  if (decoded.purpose !== "PASSWORD_RESET") {
    throw unauthorized("Invalid reset token purpose");
  }

  const user = await UserModel.findById(decoded.userId).select(
    "+password +resetOtp +resetOtpExpires",
  );
  if (!user || user.isDeleted || user.status !== "ACTIVE") {
    throw notFound("Active user account not found");
  }

  // Enforce single-use reset token: resetOtp is cleared immediately once used
  if (!user.resetOtp || !user.resetOtpExpires) {
    throw unauthorized("Reset token has already been used or expired");
  }

  user.password = newPassword;
  user.mustChangePassword = false;
  user.resetOtp = null;
  user.resetOtpExpires = null;
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
