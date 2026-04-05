import PostInventoryScreen from "@/components/admin/post-inventory-screen";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { getPostInventorySnapshot } from "@/features/posts";
import { requireAdminPageSession } from "@/lib/auth";
import { ADMIN_PERMISSIONS, hasAdminPermission } from "@/lib/auth/rbac";

export default async function DraftsPage({ searchParams }) {
  const auth = await requireAdminPageSession("/admin/posts/drafts");
  const resolvedSearchParams = await searchParams;
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getPostInventorySnapshot({
      page: resolvedSearchParams.page,
      scope: "drafts",
      search: resolvedSearchParams.search,
    }),
  ]);

  return (
    <PostInventoryScreen
      copy={messages.admin.draftsList}
      initialData={snapshot}
      permissions={{
        canManageLocalization: hasAdminPermission(auth.user, ADMIN_PERMISSIONS.MANAGE_LOCALIZATION),
        canPublish: hasAdminPermission(auth.user, ADMIN_PERMISSIONS.PUBLISH_POSTS),
      }}
    />
  );
}
