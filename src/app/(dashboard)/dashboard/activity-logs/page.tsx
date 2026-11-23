import ActivityLogsPage from "@/components/dashboard/pages/activity-logs/ActivityLogsPage";
import InlineLoader from "@/components/shared/InlineLoader";
import { Suspense } from "react";

export default function ActivityLogsRoutePage() {
  return (
    <Suspense fallback={<InlineLoader text="Loading activity logs..." />}>
      <ActivityLogsPage />
    </Suspense>
  );
}
