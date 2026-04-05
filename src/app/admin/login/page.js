import AdminLoginScreen from "@/components/auth/admin-login-screen";
import { normalizeAdminRedirectTarget } from "@/lib/auth";

export const metadata = {
  title: "Admin Login",
  description: "Sign in to the Equip Blog admin workspace.",
};

export default async function AdminLoginPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const nextPath = normalizeAdminRedirectTarget(resolvedSearchParams?.next);

  return <AdminLoginScreen nextPath={nextPath} />;
}
