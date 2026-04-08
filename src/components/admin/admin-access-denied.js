/**
 * Fallback admin screen that explains NewsPub RBAC access denials to authenticated operators.
 */

import NoticePage from "@/components/common/notice-page";
import { getAdminPermissionTitle } from "@/lib/auth/rbac";

/**
 * Renders the Admin Access Denied Page in the NewsPub admin workspace.
 */
export default function AdminAccessDeniedPage({ pathname, permission, user }) {
  const requiredPermission = getAdminPermissionTitle(permission);

  return (
    <NoticePage
      badges={[pathname, user.role, `Requires ${requiredPermission}`]}
      description="This admin area exists, but the signed-in role is not allowed to use it under the Release 1 authorization policy."
      eyebrow="Access denied"
      icon="warning"
      notes={[
        `Signed in as ${user.email}.`,
        `${user.role} does not include ${requiredPermission.toLowerCase()} by default.`,
        "Server-side RBAC still blocks the underlying admin APIs even if the UI is bypassed.",
      ]}
      title="This area is not available for your role"
    />
  );
}
