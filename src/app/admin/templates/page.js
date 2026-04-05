import {
  AdminDescription,
  AdminEyebrow,
  AdminHero,
  AdminPage,
  AdminTitle,
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
  MetaPill,
  RecordCard,
  RecordHeader,
  RecordMeta,
  RecordStack,
  RecordTitle,
  RecordTitleBlock,
  SectionGrid,
  SmallText,
  SummaryCard,
  SummaryGrid,
  SummaryLabel,
  SummaryValue,
  formatEnumLabel,
} from "@/components/admin/news-admin-ui";
import TemplateFormCard from "@/components/admin/template-form-card";
import { getTemplateManagementSnapshot } from "@/features/templates";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { saveTemplateAction } from "../actions";

const platformValues = ["WEBSITE", "FACEBOOK", "INSTAGRAM"];
const platformOptions = platformValues.map((value) => ({
  badge: value,
  description: `${formatEnumLabel(value)} publishing template`,
  label: formatEnumLabel(value),
  value,
}));

export default async function TemplatesPage() {
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getTemplateManagementSnapshot(),
  ]);
  const copy = messages.admin.templates;
  const categoryOptions = [
    {
      description: "Use the platform and locale defaults without a category-specific override.",
      label: "No category override",
      value: "",
    },
    ...snapshot.categories.map((category) => ({
      description: category.description || "Apply this template when the story is assigned to the category.",
      label: category.name,
      value: category.id,
    })),
  ];

  return (
    <AdminPage>
      <AdminHero>
        <AdminEyebrow>{messages.admin.title}</AdminEyebrow>
        <AdminTitle>{copy.title}</AdminTitle>
        <AdminDescription>{copy.description}</AdminDescription>
      </AdminHero>

      <SummaryGrid>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.totalCount}</SummaryValue>
          <SummaryLabel>Total templates</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.defaultCount}</SummaryValue>
          <SummaryLabel>Platform defaults</SummaryLabel>
        </SummaryCard>
      </SummaryGrid>

      <SectionGrid>
        <Card>
          <CardHeader>
            <CardTitle>Configured templates</CardTitle>
            <CardDescription>Each template stays grouped by overrides so editorial teams can scan intent quickly.</CardDescription>
          </CardHeader>
          <RecordStack>
            {snapshot.templates.map((template) => (
              <RecordCard key={template.id}>
                <RecordHeader>
                  <RecordTitleBlock>
                    <RecordTitle>{template.name}</RecordTitle>
                    <SmallText>
                      {template.category?.name || template.locale || "Platform-level template"}
                    </SmallText>
                  </RecordTitleBlock>
                  <RecordMeta>
                    <MetaPill>{formatEnumLabel(template.platform)}</MetaPill>
                    {template.isDefault ? <MetaPill>Default</MetaPill> : null}
                  </RecordMeta>
                </RecordHeader>
                <TemplateFormCard
                  action={saveTemplateAction}
                  categoryOptions={categoryOptions}
                  platformOptions={platformOptions}
                  submitLabel="Save template"
                  template={template}
                />
              </RecordCard>
            ))}
          </RecordStack>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add template</CardTitle>
            <CardDescription>
              Template selection order follows stream, platform plus category, platform plus locale, then platform default.
            </CardDescription>
          </CardHeader>
          <TemplateFormCard
            action={saveTemplateAction}
            categoryOptions={categoryOptions}
            platformOptions={platformOptions}
            submitLabel="Create template"
          />
        </Card>
      </SectionGrid>
    </AdminPage>
  );
}
