import LoginForm from "@/components/auth/pages/login/LoginForm";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-[440px]">
        <LoginForm />
      </div>
    </div>
  );
}
