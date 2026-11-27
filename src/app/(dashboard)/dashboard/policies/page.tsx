import PoliciesPage from "@/components/dashboard/pages/policies/PoliciesPage";
import InlineLoader from "@/components/shared/InlineLoader";
import { Suspense } from "react";

export default function PoliciesRoutePage() {
  return (
    <Suspense fallback={<InlineLoader text="Loading policies & rules..." />}>
      <PoliciesPage />
    </Suspense>
  );
}
