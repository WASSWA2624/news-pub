import {
  AdminDescription,
  AdminEyebrow,
  AdminHero,
  AdminPage,
  AdminTitle,
  ButtonRow,
  Card,
  CardDescription,
  CardTitle,
  Field,
  FieldGrid,
  FieldLabel,
  Input,
  PrimaryButton,
  SectionGrid,
  SmallText,
  SummaryCard,
  SummaryGrid,
  SummaryLabel,
  SummaryValue,
  Textarea,
  Select,
} from "@/components/admin/news-admin-ui";
import { getTemplateManagementSnapshot } from "@/features/templates";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { saveTemplateAction } from "../actions";

const platformValues = ["WEBSITE", "FACEBOOK", "INSTAGRAM"];

export default async function TemplatesPage() {
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getTemplateManagementSnapshot(),
  ]);
  const copy = messages.admin.templates;

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
          <CardTitle>Configured templates</CardTitle>
          {snapshot.templates.map((template) => (
            <form action={saveTemplateAction} key={template.id}>
              <input name="id" type="hidden" value={template.id} />
              <FieldGrid>
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <Input defaultValue={template.name} name="name" required />
                </Field>
                <Field>
                  <FieldLabel>Platform</FieldLabel>
                  <Select defaultValue={template.platform} name="platform">
                    {platformValues.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Locale override</FieldLabel>
                  <Input defaultValue={template.locale || ""} name="locale" />
                </Field>
                <Field>
                  <FieldLabel>Category override</FieldLabel>
                  <Select defaultValue={template.categoryId || ""} name="categoryId">
                    <option value="">No category override</option>
                    {snapshot.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </FieldGrid>
              <Field style={{ marginTop: "0.85rem" }}>
                <FieldLabel>Title template</FieldLabel>
                <Textarea defaultValue={template.titleTemplate || ""} name="titleTemplate" />
              </Field>
              <Field style={{ marginTop: "0.85rem" }}>
                <FieldLabel>Summary template</FieldLabel>
                <Textarea defaultValue={template.summaryTemplate || ""} name="summaryTemplate" />
              </Field>
              <Field style={{ marginTop: "0.85rem" }}>
                <FieldLabel>Body template</FieldLabel>
                <Textarea defaultValue={template.bodyTemplate} name="bodyTemplate" />
              </Field>
              <Field style={{ marginTop: "0.85rem" }}>
                <FieldLabel>Hashtags template</FieldLabel>
                <Textarea defaultValue={template.hashtagsTemplate || ""} name="hashtagsTemplate" />
              </Field>
              <ButtonRow style={{ marginTop: "0.85rem" }}>
                <label>
                  <input defaultChecked={template.isDefault} name="isDefault" type="checkbox" /> Default for platform
                </label>
                <PrimaryButton type="submit">Save template</PrimaryButton>
              </ButtonRow>
              <SmallText>
                Linked streams: {(template.streams || []).map((stream) => stream.name).join(", ") || "None"}
              </SmallText>
            </form>
          ))}
        </Card>

        <Card>
          <CardTitle>Add template</CardTitle>
          <CardDescription>
            Template selection order follows stream, platform plus category, platform plus locale, then platform default.
          </CardDescription>
          <form action={saveTemplateAction}>
            <FieldGrid>
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input name="name" required />
              </Field>
              <Field>
                <FieldLabel>Platform</FieldLabel>
                <Select defaultValue="WEBSITE" name="platform">
                  {platformValues.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </Field>
            </FieldGrid>
            <Field style={{ marginTop: "0.85rem" }}>
              <FieldLabel>Body template</FieldLabel>
              <Textarea
                name="bodyTemplate"
                placeholder="{{title}}\n\n{{summary}}\n\nRead more: {{canonicalUrl}}"
              />
            </Field>
            <ButtonRow style={{ marginTop: "0.85rem" }}>
              <PrimaryButton type="submit">Create template</PrimaryButton>
            </ButtonRow>
          </form>
        </Card>
      </SectionGrid>
    </AdminPage>
  );
}
