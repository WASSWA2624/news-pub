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
  StatusBadge,
  SummaryCard,
  SummaryGrid,
  SummaryLabel,
  SummaryValue,
  Textarea,
} from "@/components/admin/news-admin-ui";
import { getProviderManagementSnapshot } from "@/features/providers";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { saveProviderAction } from "../actions";

export default async function ProvidersPage() {
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getProviderManagementSnapshot(),
  ]);
  const copy = messages.admin.providers;

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
          <SummaryLabel>Total providers</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.enabledCount}</SummaryValue>
          <SummaryLabel>Enabled providers</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.configuredCredentialCount}</SummaryValue>
          <SummaryLabel>Credentials configured</SummaryLabel>
        </SummaryCard>
      </SummaryGrid>

      <SectionGrid>
        <Card>
          <CardTitle>Configured providers</CardTitle>
          <CardDescription>
            Provider secrets remain env-only. This screen controls selection, defaults, labels, and
            request defaults.
          </CardDescription>
          {snapshot.configs.map((provider) => (
            <form action={saveProviderAction} key={provider.id}>
              <FieldGrid>
                <Field>
                  <FieldLabel>Provider key</FieldLabel>
                  <Input defaultValue={provider.providerKey} name="providerKey" required />
                </Field>
                <Field>
                  <FieldLabel>Label</FieldLabel>
                  <Input defaultValue={provider.label} name="label" required />
                </Field>
                <Field>
                  <FieldLabel>Base URL</FieldLabel>
                  <Input defaultValue={provider.baseUrl || ""} name="baseUrl" />
                </Field>
                <Field>
                  <FieldLabel>Credential state</FieldLabel>
                  <div>
                    <StatusBadge $tone={provider.credentialState === "configured" ? "success" : "warning"}>
                      {provider.credentialState}
                    </StatusBadge>
                  </div>
                </Field>
              </FieldGrid>
              <Field style={{ marginTop: "0.85rem" }}>
                <FieldLabel>Description</FieldLabel>
                <Textarea defaultValue={provider.description || ""} name="description" />
              </Field>
              <Field style={{ marginTop: "0.85rem" }}>
                <FieldLabel>Request defaults JSON</FieldLabel>
                <Textarea
                  defaultValue={JSON.stringify(provider.requestDefaultsJson || {}, null, 2)}
                  name="requestDefaultsJson"
                />
              </Field>
              <ButtonRow style={{ marginTop: "0.85rem" }}>
                <label>
                  <input defaultChecked={provider.isEnabled} name="isEnabled" type="checkbox" /> Enabled
                </label>
                <label>
                  <input defaultChecked={provider.isSelectable} name="isSelectable" type="checkbox" /> Selectable
                </label>
                <label>
                  <input defaultChecked={provider.isDefault} name="isDefault" type="checkbox" /> Default
                </label>
                <PrimaryButton type="submit">Save provider</PrimaryButton>
              </ButtonRow>
            </form>
          ))}
        </Card>

        <Card>
          <CardTitle>Add provider record</CardTitle>
          <CardDescription>Supported providers are seeded, but additional records can still be adjusted here.</CardDescription>
          <form action={saveProviderAction}>
            <FieldGrid>
              <Field>
                <FieldLabel>Provider key</FieldLabel>
                <Input name="providerKey" placeholder="mediastack" required />
              </Field>
              <Field>
                <FieldLabel>Label</FieldLabel>
                <Input name="label" placeholder="Mediastack" required />
              </Field>
            </FieldGrid>
            <Field style={{ marginTop: "0.85rem" }}>
              <FieldLabel>Description</FieldLabel>
              <Textarea name="description" />
            </Field>
            <Field style={{ marginTop: "0.85rem" }}>
              <FieldLabel>Request defaults JSON</FieldLabel>
              <Textarea name="requestDefaultsJson" placeholder='{"languages":["en"]}' />
            </Field>
            <ButtonRow style={{ marginTop: "0.85rem" }}>
              <label>
                <input defaultChecked name="isEnabled" type="checkbox" /> Enabled
              </label>
              <label>
                <input defaultChecked name="isSelectable" type="checkbox" /> Selectable
              </label>
              <PrimaryButton type="submit">Create provider</PrimaryButton>
            </ButtonRow>
          </form>
          <SmallText>
            Supported catalog: {snapshot.supportedProviders.map((provider) => provider.label).join(", ")}.
          </SmallText>
        </Card>
      </SectionGrid>
    </AdminPage>
  );
}
