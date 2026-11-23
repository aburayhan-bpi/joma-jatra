import MembersPage from "@/components/dashboard/pages/members/MembersPage";
import InlineLoader from "@/components/shared/InlineLoader";
import { Suspense } from "react";

export default function MembersRoutePage() {
  return (
    <Suspense fallback={<InlineLoader text="Loading members..." />}>
      <MembersPage />
    </Suspense>
  );
}
