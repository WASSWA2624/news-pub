import PostEditorScreen from "@/components/admin/post-editor-screen";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { getPostEditorSnapshot } from "@/features/posts";
import { requireAdminPageSession } from "@/lib/auth";
import { ADMIN_PERMISSIONS, hasAdminPermission } from "@/lib/auth/rbac";

export default async function PostEditorPage({ params }) {
  const { id } = await params;
  const auth = await requireAdminPageSession(`/admin/posts/${id}`);
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getPostEditorSnapshot({
      postId: id,
    }),
  ]);

  return (
    <PostEditorScreen
      copy={messages.admin.postEditor}
      initialData={snapshot}
      permissions={{
        canArchive: hasAdminPermission(auth.user, ADMIN_PERMISSIONS.ARCHIVE_POSTS),
        canManageLocalization: hasAdminPermission(auth.user, ADMIN_PERMISSIONS.MANAGE_LOCALIZATION),
        canPublish: hasAdminPermission(auth.user, ADMIN_PERMISSIONS.PUBLISH_POSTS),
        canSchedule: hasAdminPermission(auth.user, ADMIN_PERMISSIONS.SCHEDULE_POSTS),
      }}
    />
  );
}
