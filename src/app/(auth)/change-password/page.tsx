import { redirect } from "next/navigation";

/**
 * Redirects /change-password to the authenticated profile password settings section.
 */
export default function ChangePasswordRedirectPage() {
  redirect("/dashboard/profile#password");
}
