/**
 * Admin layout that loads the authenticated NewsPub operator and wraps admin pages with the shared shell.
 */

import AdminAccessDeniedPage from "@/components/admin/admin-access-denied";
import AdminProviders from "@/components/admin/admin-providers";
import AdminShell from "@/components/layout/admin-shell";
import { getOptionalAdminSession, normalizeAdminRedirectTarget, requireAdminPageSession } from "@/lib/auth";
import {
  ADMIN_REDIRECT_PARAM,
  ADMIN_REQUEST_PATH_HEADER,
  ADMIN_ROUTE_KIND_HEADER,
} from "@/lib/auth/config";
import { getAdminPageAccess, hasAdminPermission } from "@/lib/auth/rbac";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { LocaleMessagesProvider } from "@/features/i18n/locale-provider";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Builds route metadata for NewsPub admin dashboard page.
 */
export async function generateMetadata() {
  return {
    title: "NewsPub Admin",
    description: "Operational workspace for NewsPub providers, streams, publishing, and analytics.",
  };
}
/**
 * Renders the shared NewsPub admin layout.
 */

export default async function AdminLayout({ children }) {
  const requestHeaders = await headers();
  const routeKind = requestHeaders.get(ADMIN_ROUTE_KIND_HEADER);
  const requestPath = requestHeaders.get(ADMIN_REQUEST_PATH_HEADER) || "/admin";
  const messages = await getMessages(defaultLocale);
  const authState =
    routeKind === "protected"
      ? await requireAdminPageSession(requestPath)
      : await getOptionalAdminSession();

  if (routeKind === "login" && authState) {
    const redirectUrl = new URL(requestPath, "https://news-pub.local");

    redirect(normalizeAdminRedirectTarget(redirectUrl.searchParams.get(ADMIN_REDIRECT_PARAM)));
  }

  if (routeKind !== "protected") {
    return (
      <LocaleMessagesProvider locale={defaultLocale} messages={messages}>
        <AdminProviders>{children}</AdminProviders>
      </LocaleMessagesProvider>
    );
  }

  const pageAccess = getAdminPageAccess(requestPath);
  const isAuthorizedForPage =
    !pageAccess || hasAdminPermission(authState.user, pageAccess.permission);

  return (
    <LocaleMessagesProvider locale={defaultLocale} messages={messages}>
      <AdminProviders>
        <AdminShell messages={messages} user={authState.user}>
          {isAuthorizedForPage ? (
            children
          ) : (
            <AdminAccessDeniedPage
              pathname={pageAccess.pathname}
              permission={pageAccess.permission}
              user={authState.user}
            />
          )}
        </AdminShell>
      </AdminProviders>
    </LocaleMessagesProvider>
  );
}
