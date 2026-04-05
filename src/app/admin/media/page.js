import MediaLibraryScreen from "@/components/admin/media-library-screen";
import { getMediaLibrarySnapshot } from "@/features/media";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";

export default async function MediaPage() {
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getMediaLibrarySnapshot(),
  ]);

  return <MediaLibraryScreen copy={messages.admin.mediaLibrary} initialData={snapshot} />;
}
