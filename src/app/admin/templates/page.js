import {
  AdminDescription,
  AdminEyebrow,
  AdminHero,
  AdminPage,
  AdminTitle,
  ButtonRow,
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
  Field,
  FieldGrid,
  FieldLabel,
  FormSection,
  FormSectionTitle,
  Input,
  MetaPill,
  PrimaryButton,
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
  Textarea,
  formatEnumLabel,
} from "@/components/admin/news-admin-ui";
import SearchableSelect from "@/components/common/searchable-select";
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

                <form action={saveTemplateAction}>
                  <input name="id" type="hidden" value={template.id} />
                  <FormSection>
                    <FormSectionTitle>Resolution rules</FormSectionTitle>
                    <FieldGrid>
                      <Field>
                        <FieldLabel>Name</FieldLabel>
                        <Input defaultValue={template.name} name="name" required />
                      </Field>
                      <Field as="div">
                        <FieldLabel>Platform</FieldLabel>
                        <SearchableSelect
                          ariaLabel="Template platform"
                          defaultValue={template.platform}
                          name="platform"
                          options={platformOptions}
                          placeholder="Select a platform"
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Locale override</FieldLabel>
                        <Input defaultValue={template.locale || ""} name="locale" />
                      </Field>
                      <Field as="div">
                        <FieldLabel>Category override</FieldLabel>
                        <SearchableSelect
                          ariaLabel="Category override"
                          defaultValue={template.categoryId || ""}
                          name="categoryId"
                          options={categoryOptions}
                          placeholder="Select a category override"
                        />
                      </Field>
                    </FieldGrid>
                  </FormSection>

                  <FormSection>
                    <FormSectionTitle>Template content</FormSectionTitle>
                    <Field>
                      <FieldLabel>Title template</FieldLabel>
                      <Textarea defaultValue={template.titleTemplate || ""} name="titleTemplate" />
                    </Field>
                    <Field>
                      <FieldLabel>Summary template</FieldLabel>
                      <Textarea defaultValue={template.summaryTemplate || ""} name="summaryTemplate" />
                    </Field>
                    <Field>
                      <FieldLabel>Body template</FieldLabel>
                      <Textarea defaultValue={template.bodyTemplate} name="bodyTemplate" />
                    </Field>
                    <Field>
                      <FieldLabel>Hashtags template</FieldLabel>
                      <Textarea defaultValue={template.hashtagsTemplate || ""} name="hashtagsTemplate" />
                    </Field>
                    <ButtonRow>
                      <label>
                        <input defaultChecked={template.isDefault} name="isDefault" type="checkbox" /> Default for platform
                      </label>
                      <PrimaryButton type="submit">Save template</PrimaryButton>
                    </ButtonRow>
                    <SmallText>
                      Linked streams: {(template.streams || []).map((stream) => stream.name).join(", ") || "None"}
                    </SmallText>
                  </FormSection>
                </form>
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
          <form action={saveTemplateAction}>
            <FieldGrid>
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input name="name" required />
              </Field>
              <Field as="div">
                <FieldLabel>Platform</FieldLabel>
                <SearchableSelect
                  ariaLabel="Template platform"
                  defaultValue="WEBSITE"
                  name="platform"
                  options={platformOptions}
                  placeholder="Select a platform"
                />
              </Field>
            </FieldGrid>
            <FormSection>
              <FormSectionTitle>Body template</FormSectionTitle>
              <Field>
                <FieldLabel>Body template</FieldLabel>
                <Textarea
                  name="bodyTemplate"
                  placeholder="{{title}}\n\n{{summary}}\n\nRead more: {{canonicalUrl}}"
                />
              </Field>
              <ButtonRow>
                <PrimaryButton type="submit">Create template</PrimaryButton>
              </ButtonRow>
            </FormSection>
          </form>
        </Card>
      </SectionGrid>
    </AdminPage>
  );
}
