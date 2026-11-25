import ResetPasswordForm from "@/components/auth/pages/reset-password/ResetPasswordForm";
import InlineLoader from "@/components/shared/InlineLoader";
import { Suspense } from "react";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-[440px]">
        <Suspense fallback={<InlineLoader text="Loading reset form..." />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
