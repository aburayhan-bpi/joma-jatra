import ReturnsPage from "@/components/dashboard/pages/returns/ReturnsPage";
import InlineLoader from "@/components/shared/InlineLoader";
import { Suspense } from "react";

export default function ReturnsRoutePage() {
  return (
    <Suspense fallback={<InlineLoader text="Loading returns..." />}>
      <ReturnsPage />
    </Suspense>
  );
}
