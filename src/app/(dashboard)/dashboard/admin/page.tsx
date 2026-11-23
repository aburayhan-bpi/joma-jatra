import { redirect } from "next/navigation";

/**
 * Legacy /dashboard/admin route redirects to the unified role-aware /dashboard page.
 */
export default function AdminDashboardRedirect() {
  redirect("/dashboard");
}
