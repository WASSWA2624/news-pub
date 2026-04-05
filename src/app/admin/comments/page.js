import CommentModerationScreen from "@/components/admin/comment-moderation-screen";
import { getCommentModerationSnapshot } from "@/features/comments";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";

export default async function CommentsPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getCommentModerationSnapshot({
      commentId: resolvedSearchParams.commentId,
      page: resolvedSearchParams.page,
      query: resolvedSearchParams.query,
      status: resolvedSearchParams.status,
    }),
  ]);

  return (
    <CommentModerationScreen
      copy={messages.admin.commentsModeration}
      initialData={snapshot}
    />
  );
}
