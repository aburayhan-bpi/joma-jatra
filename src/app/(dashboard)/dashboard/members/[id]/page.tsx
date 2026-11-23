import MemberDetailsPage from "@/components/dashboard/pages/members/MemberDetailsPage";
import InlineLoader from "@/components/shared/InlineLoader";
import { Suspense } from "react";

export default async function MemberDetailsRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<InlineLoader text="Loading member details..." />}>
      <MemberDetailsPage memberId={id} />
    </Suspense>
  );
}
