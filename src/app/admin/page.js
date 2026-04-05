import AnalyticsDashboardScreen from "@/components/admin/analytics-dashboard-screen";
import { getAdminDashboardSnapshot } from "@/features/analytics";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { requireAdminPageSession } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const auth = await requireAdminPageSession("/admin");
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getAdminDashboardSnapshot(auth.user),
  ]);

  return <AnalyticsDashboardScreen copy={messages.admin.dashboard} initialData={snapshot} />;
}
