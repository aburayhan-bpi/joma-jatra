import AccountsPage from "@/components/dashboard/pages/accounts/AccountsPage";
import InlineLoader from "@/components/shared/InlineLoader";
import { Suspense } from "react";

export default function AccountsRoutePage() {
  return (
    <Suspense fallback={<InlineLoader text="Loading accounts..." />}>
      <AccountsPage />
    </Suspense>
  );
}
