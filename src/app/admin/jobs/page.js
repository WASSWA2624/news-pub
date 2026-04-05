import JobLogsScreen from "@/components/admin/job-logs-screen";
import { getAdminJobLogsSnapshot } from "@/features/analytics";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";

export default async function JobsPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getAdminJobLogsSnapshot({
      jobId: resolvedSearchParams.jobId,
      search: resolvedSearchParams.search,
      status: resolvedSearchParams.status,
    }),
  ]);

  return <JobLogsScreen copy={messages.admin.jobLogs} initialData={snapshot} />;
}
