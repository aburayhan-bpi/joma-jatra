"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import PassViewToggleBtn from "@/components/shared/PassViewToggleBtn";
import { WEBSITE_DETAILS } from "@/lib/constants";
import { useLoginMutation } from "@/redux/api/auth/authApi";
import { useLazyGetMeQuery } from "@/redux/api/getMe/getMeApi";
import { setTokens, setUser } from "@/redux/features/user/authSlice";
import { useAppDispatch } from "@/redux/hook";
import { ILoginPayload } from "@/types/global";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [triggerGetMe] = useLazyGetMeQuery();

  const [showPassword, setShowPassword] = useState({ password: false });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await login(data as ILoginPayload).unwrap();

      const accessToken = result?.data?.accessToken;
      const refreshToken = result?.data?.refreshToken;
      if (!result?.success || !accessToken) {
        toast.error("Something went wrong. Please try again.");
        return;
      }

      dispatch(setTokens({ accessToken, refreshToken }));
      const profile = await triggerGetMe().unwrap();

      if (!profile?.data) {
        toast.error("Profile data not found. Please try again.");
        return;
      }

      dispatch(setUser(profile.data));
      router.push("/dashboard");
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      const errorMessage =
        error?.data?.message || "Something went wrong. Please try again.";
      toast.error(errorMessage);
    }
  };

  const loading = isSubmitting || isLoginLoading;

  return (
    <div className="w-full bg-card border border-border auth-card-shadow rounded-2xl p-8 sm:p-10">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-2">
          Welcome Back
        </h1>
        <p className="text-muted-foreground text-sm">
          Sign in to your {WEBSITE_DETAILS.SITE_NAME} dashboard
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5 group">
          <label
            htmlFor="email"
            className="text-sm font-medium text-text-description"
          >
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-secondary">
              <Mail className="h-[18px] w-[18px]" />
            </div>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              className={`w-full pl-10 pr-4 h-12 bg-card border border-input text-foreground placeholder:text-text-secondary text-sm rounded-xl focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none ${errors.email ? "border-error focus:border-error focus:ring-error/10" : ""}`}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-error mt-1">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5 group">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-medium text-text-description"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:text-brand-dark transition-colors cursor-pointer"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-secondary">
              <Lock className="h-[18px] w-[18px]" />
            </div>
            <input
              id="password"
              type={showPassword.password ? "text" : "password"}
              placeholder="••••••••"
              className={`w-full pl-10 pr-10 h-12 bg-card border border-input text-foreground placeholder:text-text-secondary text-sm rounded-xl focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none ${errors.password ? "border-error focus:border-error focus:ring-error/10" : ""}`}
              {...register("password")}
            />
            <PassViewToggleBtn
              field="password"
              showPassword={showPassword.password}
              setShowPassword={setShowPassword}
            />
          </div>
          {errors.password && (
            <p className="text-xs text-error mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 mt-4 bg-primary hover:bg-brand-dark text-primary-foreground font-semibold text-sm rounded-xl transition-colors flex items-center justify-center cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>
    </div>
  );
}
