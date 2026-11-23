"use client";

import PassViewToggleBtn from "@/components/shared/PassViewToggleBtn";
import { useResetPasswordMutation } from "@/redux/api/auth/authApi";
import { clearResetPassToken } from "@/redux/features/user/authSlice";
import { clearEmail } from "@/redux/features/verifyAuth/verifyAuth";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { getApiErrorMessage } from "@/utils/formatMoney";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm Password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

/**
 * Reset Password Form — accepts resetToken from either URL (?token=...)
 * or Redux state (populated right after /verify-email OTP confirmation).
 */
export default function ResetPasswordForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tokenFromStore = useAppSelector((state) => state.auth.resetPassToken);
  const token = searchParams.get("token") || tokenFromStore;

  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirmPassword: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordData) => {
    if (!token) {
      toast.error("Invalid or expired reset session. Please request a new OTP.");
      return;
    }

    try {
      const result = await resetPassword({
        resetToken: token,
        newPassword: data.password,
      }).unwrap();

      if (result.success) {
        dispatch(clearResetPassToken());
        dispatch(clearEmail());
        toast.success("Password reset successfully!");
        router.replace("/login");
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to reset password."));
    }
  };

  if (!token) {
    return (
      <div className="w-full bg-card border border-border rounded-md p-7 sm:p-9 text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="w-10 h-10 text-error" />
        </div>
        <h2 className="text-lg font-bold text-foreground tracking-tight mb-2">
          Session Expired
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          Your password reset session is missing or expired. Please request a
          new verification OTP.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center justify-center w-full h-10 bg-card border border-primary text-primary hover:bg-muted font-semibold text-sm rounded transition-colors cursor-pointer"
        >
          Request New OTP
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-card border border-border rounded-md p-7 sm:p-9">
      <div className="text-center mb-7">
        <h1 className="text-xl font-bold text-foreground tracking-tight mb-1.5">
          Set New Password
        </h1>
        <p className="text-muted-foreground text-sm">
          Please enter your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-xs font-medium text-text-description"
          >
            New Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="password"
              type={showPassword.password ? "text" : "password"}
              placeholder="••••••••"
              className={`w-full pl-9 pr-10 h-10 bg-card border border-input text-foreground placeholder:text-text-secondary text-sm rounded focus:ring-2 focus:ring-primary/15 focus:border-primary transition-colors outline-none ${
                errors.password ? "border-error focus:border-error" : ""
              }`}
              {...register("password")}
            />
            <PassViewToggleBtn
              field="password"
              showPassword={showPassword.password}
              setShowPassword={setShowPassword}
            />
          </div>
          {errors.password && (
            <p className="text-xs text-error mt-1">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="confirmPassword"
            className="text-xs font-medium text-text-description"
          >
            Confirm Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="confirmPassword"
              type={showPassword.confirmPassword ? "text" : "password"}
              placeholder="••••••••"
              className={`w-full pl-9 pr-10 h-10 bg-card border border-input text-foreground placeholder:text-text-secondary text-sm rounded focus:ring-2 focus:ring-primary/15 focus:border-primary transition-colors outline-none ${
                errors.confirmPassword ? "border-error focus:border-error" : ""
              }`}
              {...register("confirmPassword")}
            />
            <PassViewToggleBtn
              field="confirmPassword"
              showPassword={showPassword.confirmPassword}
              setShowPassword={setShowPassword}
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-error mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-10 mt-2 bg-primary hover:bg-brand-dark text-primary-foreground font-semibold text-sm rounded transition-colors flex items-center justify-center cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting...
            </>
          ) : (
            "Save New Password"
          )}
        </button>
      </form>
    </div>
  );
}
