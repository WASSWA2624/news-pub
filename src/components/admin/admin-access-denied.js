import PlaceholderPage from "@/components/common/placeholder-page";
import { getAdminPermissionTitle } from "@/lib/auth/rbac";

export default function AdminAccessDeniedPage({ pathname, permission, user }) {
  const requiredPermission = getAdminPermissionTitle(permission);

  return (
    <PlaceholderPage
      badges={[pathname, user.role, `Requires ${requiredPermission}`]}
      description="This admin area exists, but the signed-in role is not allowed to use it under the Release 1 authorization policy."
      eyebrow="Access denied"
      notes={[
        `Signed in as ${user.email}.`,
        `${user.role} does not include ${requiredPermission.toLowerCase()} by default.`,
        "Server-side RBAC still blocks the underlying admin APIs even if the UI is bypassed.",
      ]}
      title="This area is not available for your role"
    />
  );
}
