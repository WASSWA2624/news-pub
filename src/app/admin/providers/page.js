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
  CheckboxChip,
  CheckboxRow,
  Field,
  FieldGrid,
  FieldLabel,
  Input,
  FormSection,
  FormSectionTitle,
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
          <CardHeader>
            <CardTitle>Configured providers</CardTitle>
            <CardDescription>
              Provider secrets remain env-only. This screen controls selection, defaults, labels,
              and request defaults.
            </CardDescription>
          </CardHeader>
          <RecordStack>
            {snapshot.configs.map((provider) => (
              <RecordCard key={provider.id}>
                <RecordHeader>
                  <RecordTitleBlock>
                    <RecordTitle>{provider.label}</RecordTitle>
                    <SmallText>
                      {provider.description || provider.baseUrl || "Provider configuration record."}
                    </SmallText>
                  </RecordTitleBlock>
                  <RecordMeta>
                    <MetaPill>{provider.providerKey}</MetaPill>
                    <StatusBadge $tone={provider.credentialState === "configured" ? "success" : "warning"}>
                      {provider.credentialState}
                    </StatusBadge>
                  </RecordMeta>
                </RecordHeader>

                <form action={saveProviderAction}>
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
                  </FieldGrid>

                  <FormSection>
                    <FormSectionTitle>Request behavior</FormSectionTitle>
                    <Field>
                      <FieldLabel>Description</FieldLabel>
                      <Textarea defaultValue={provider.description || ""} name="description" />
                    </Field>
                    <Field>
                      <FieldLabel>Request defaults JSON</FieldLabel>
                      <Textarea
                        defaultValue={JSON.stringify(provider.requestDefaultsJson || {}, null, 2)}
                        name="requestDefaultsJson"
                      />
                    </Field>
                  </FormSection>

                  <FormSection>
                    <FormSectionTitle>Availability</FormSectionTitle>
                    <CheckboxRow>
                      <CheckboxChip>
                        <input defaultChecked={provider.isEnabled} name="isEnabled" type="checkbox" /> Enabled
                      </CheckboxChip>
                      <CheckboxChip>
                        <input defaultChecked={provider.isSelectable} name="isSelectable" type="checkbox" /> Selectable
                      </CheckboxChip>
                      <CheckboxChip>
                        <input defaultChecked={provider.isDefault} name="isDefault" type="checkbox" /> Default
                      </CheckboxChip>
                    </CheckboxRow>
                    <ButtonRow>
                      <PrimaryButton type="submit">Save provider</PrimaryButton>
                    </ButtonRow>
                  </FormSection>
                </form>
              </RecordCard>
            ))}
          </RecordStack>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add provider record</CardTitle>
            <CardDescription>
              Supported providers are seeded, but additional records can still be adjusted here.
            </CardDescription>
          </CardHeader>
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
            <FormSection>
              <FormSectionTitle>Defaults</FormSectionTitle>
              <Field>
                <FieldLabel>Description</FieldLabel>
                <Textarea name="description" />
              </Field>
              <Field>
                <FieldLabel>Request defaults JSON</FieldLabel>
                <Textarea name="requestDefaultsJson" placeholder='{"languages":["en"]}' />
              </Field>
              <CheckboxRow>
                <CheckboxChip>
                  <input defaultChecked name="isEnabled" type="checkbox" /> Enabled
                </CheckboxChip>
                <CheckboxChip>
                  <input defaultChecked name="isSelectable" type="checkbox" /> Selectable
                </CheckboxChip>
              </CheckboxRow>
              <ButtonRow>
                <PrimaryButton type="submit">Create provider</PrimaryButton>
              </ButtonRow>
            </FormSection>
          </form>
          <SmallText>
            Supported catalog: {snapshot.supportedProviders.map((provider) => provider.label).join(", ")}.
          </SmallText>
        </Card>
      </SectionGrid>
    </AdminPage>
  );
}
