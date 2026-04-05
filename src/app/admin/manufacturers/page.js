import ManufacturerManagementScreen from "@/components/admin/manufacturer-management-screen";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { getManufacturerManagementSnapshot } from "@/lib/research";

export default async function ManufacturersPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getManufacturerManagementSnapshot({
      manufacturerId: resolvedSearchParams.manufacturerId,
    }),
  ]);

  return (
    <ManufacturerManagementScreen
      copy={messages.admin.manufacturerManagement}
      initialData={snapshot}
    />
  );
}
