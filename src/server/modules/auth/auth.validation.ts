import { z } from "zod";
import { safeImageUrlSchema } from "../../shared/validation-helpers";

export const bootstrapAdminSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Please enter a valid email address"),
  phone: z.string().trim().max(25).optional().default(""),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters")
    .max(100),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

export const verifyForgotOtpSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  otp: z.string().trim().regex(/^\d{6}$/, "OTP must be a 6-digit number"),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, "Reset token is required"),
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters")
    .max(100),
});

export const updateSelfProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
  phone: z.string().trim().max(25).optional(),
  profileImage: safeImageUrlSchema.optional(),
  personalMonthlyGoal: z
    .number()
    .min(0, "Personal monthly goal cannot be negative")
    .max(100000000, "Personal monthly goal is too large")
    .optional(),
});
