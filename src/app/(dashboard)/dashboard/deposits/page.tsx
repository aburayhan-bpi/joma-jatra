import DepositsPage from "@/components/dashboard/pages/deposits/DepositsPage";
import InlineLoader from "@/components/shared/InlineLoader";
import { Suspense } from "react";

export default function DepositsRoutePage() {
  return (
    <Suspense fallback={<InlineLoader text="Loading deposits..." />}>
      <DepositsPage />
    </Suspense>
  );
}
