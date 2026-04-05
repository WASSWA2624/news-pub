import GeneratePostScreen from "@/components/admin/generate-post-screen";
import { getAdminGeneratePostSnapshot } from "@/features/generator/admin-screen";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { requireAdminPageSession } from "@/lib/auth";

export default async function GeneratePage() {
  const auth = await requireAdminPageSession("/admin/generate");
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getAdminGeneratePostSnapshot(auth.user),
  ]);

  return <GeneratePostScreen copy={messages.admin.generatePost} initialData={snapshot} />;
}
