"use client";

import { useForgotPasswordMutation } from "@/redux/api/auth/authApi";
import { setEmail } from "@/redux/features/verifyAuth/verifyAuth";
import { useAppDispatch } from "@/redux/hooks";
import { getApiErrorMessage } from "@/utils/formatMoney";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

/**
 * Forgot Password Form — requests a 6-digit OTP and navigates to /verify-email.
 */
export default function ForgotPasswordForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordData) => {
    try {
      const result = await forgotPassword({
        email: data.email.trim().toLowerCase(),
      }).unwrap();

      if (result.success) {
        dispatch(setEmail(data.email.trim().toLowerCase()));
        toast.success(result.message || "6-digit OTP sent to your email");
        router.push("/verify-email");
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to send verification code"));
    }
  };

  return (
    <div className="w-full bg-card border border-border rounded-md p-7 sm:p-9">
      <div className="text-center mb-7">
        <h1 className="text-xl font-bold text-foreground tracking-tight mb-1.5">
          Forgot Password
        </h1>
        <p className="text-muted-foreground text-sm">
          Enter your registered email to receive a 6-digit verification OTP.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-xs font-medium text-text-description"
          >
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              className={`w-full pl-9 pr-3.5 h-10 bg-card border border-input text-foreground placeholder:text-text-secondary text-sm rounded focus:ring-2 focus:ring-primary/15 focus:border-primary transition-colors outline-none ${
                errors.email ? "border-error focus:border-error" : ""
              }`}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-error mt-1">{errors.email.message}</p>
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
              Sending OTP...
            </>
          ) : (
            "Send Verification OTP"
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:text-brand-dark cursor-pointer"
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
