/**
 * Admin login page for NewsPub operators.
 */

import AdminLoginScreen from "@/components/auth/admin-login-screen";
import { normalizeAdminRedirectTarget } from "@/lib/auth";

export const metadata = {
  title: "Admin Login",
  description: "Sign in to the NewsPub admin workspace.",
};
/**
 * Renders the NewsPub admin login page.
 */

export default async function AdminLoginPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const nextPath = normalizeAdminRedirectTarget(resolvedSearchParams?.next);

  return <AdminLoginScreen nextPath={nextPath} />;
}
