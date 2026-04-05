import CategoryManagementScreen from "@/components/admin/category-management-screen";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { getCategoryManagementSnapshot } from "@/features/posts";

export default async function CategoriesPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getCategoryManagementSnapshot({
      categoryId: resolvedSearchParams.categoryId,
    }),
  ]);

  return <CategoryManagementScreen copy={messages.admin.categoryManagement} initialData={snapshot} />;
}
