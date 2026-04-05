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
  StatusBadge,
  SummaryCard,
  SummaryGrid,
  SummaryLabel,
  SummaryValue,
  Textarea,
  formatEnumLabel,
} from "@/components/admin/news-admin-ui";
import SearchableSelect from "@/components/common/searchable-select";
import { getDestinationManagementSnapshot } from "@/features/destinations";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { saveDestinationAction } from "../actions";

const platformValues = ["WEBSITE", "FACEBOOK", "INSTAGRAM"];
const kindValues = [
  "WEBSITE",
  "FACEBOOK_PROFILE",
  "FACEBOOK_PAGE",
  "INSTAGRAM_PERSONAL",
  "INSTAGRAM_BUSINESS"
];
const connectionStatusValues = ["DISCONNECTED", "CONNECTED", "ERROR"];
const kindDescriptions = Object.freeze({
  FACEBOOK_PAGE: "Use a Facebook page publishing destination.",
  FACEBOOK_PROFILE: "Use a Facebook profile publishing destination.",
  INSTAGRAM_BUSINESS: "Use a publish-capable Instagram business account.",
  INSTAGRAM_PERSONAL: "Stored for reference, but not publish-capable automatically.",
  WEBSITE: "Publish directly to the NewsPub website.",
});
const connectionStatusDescriptions = Object.freeze({
  CONNECTED: "Ready for publishing.",
  DISCONNECTED: "Configured but not actively connected.",
  ERROR: "Needs operator attention before publishing.",
});
const platformOptions = platformValues.map((value) => ({
  badge: value,
  description: `${formatEnumLabel(value)} destination`,
  label: formatEnumLabel(value),
  value,
}));
const kindOptions = kindValues.map((value) => ({
  badge: value.split("_")[0],
  description: kindDescriptions[value],
  label: formatEnumLabel(value),
  value,
}));
const connectionStatusOptions = connectionStatusValues.map((value) => ({
  description: connectionStatusDescriptions[value],
  label: formatEnumLabel(value),
  value,
}));

function getTone(status) {
  if (status === "CONNECTED") {
    return "success";
  }

  if (status === "ERROR") {
    return "danger";
  }

  return "warning";
}

export default async function DestinationsPage() {
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getDestinationManagementSnapshot(),
  ]);
  const copy = messages.admin.destinations;

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
          <SummaryLabel>Total destinations</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.connectedCount}</SummaryValue>
          <SummaryLabel>Connected destinations</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.errorCount}</SummaryValue>
          <SummaryLabel>Destinations in error</SummaryLabel>
        </SummaryCard>
      </SummaryGrid>

      <SectionGrid>
        <Card>
          <CardHeader>
            <CardTitle>Configured destinations</CardTitle>
            <CardDescription>Keep each publishing target compact, connected, and easy to audit from mobile.</CardDescription>
          </CardHeader>
          <RecordStack>
            {snapshot.destinations.map((destination) => (
              <RecordCard key={destination.id}>
                <RecordHeader>
                  <RecordTitleBlock>
                    <RecordTitle>{destination.name}</RecordTitle>
                    <SmallText>{destination.accountHandle || destination.slug}</SmallText>
                  </RecordTitleBlock>
                  <RecordMeta>
                    <MetaPill>{formatEnumLabel(destination.kind)}</MetaPill>
                    <StatusBadge $tone={getTone(destination.connectionStatus)}>
                      {destination.connectionStatus}
                    </StatusBadge>
                  </RecordMeta>
                </RecordHeader>

                <form action={saveDestinationAction}>
                  <FieldGrid>
                    <Field>
                      <FieldLabel>Name</FieldLabel>
                      <Input defaultValue={destination.name} name="name" required />
                    </Field>
                    <Field>
                      <FieldLabel>Slug</FieldLabel>
                      <Input defaultValue={destination.slug} name="slug" required />
                    </Field>
                    <Field as="div">
                      <FieldLabel>Platform</FieldLabel>
                      <SearchableSelect
                        ariaLabel="Platform"
                        defaultValue={destination.platform}
                        name="platform"
                        options={platformOptions}
                        placeholder="Select a platform"
                      />
                    </Field>
                    <Field as="div">
                      <FieldLabel>Kind</FieldLabel>
                      <SearchableSelect
                        ariaLabel="Destination kind"
                        defaultValue={destination.kind}
                        name="kind"
                        options={kindOptions}
                        placeholder="Select a destination kind"
                      />
                    </Field>
                    <Field as="div">
                      <FieldLabel>Connection status</FieldLabel>
                      <SearchableSelect
                        ariaLabel="Connection status"
                        defaultValue={destination.connectionStatus}
                        name="connectionStatus"
                        options={connectionStatusOptions}
                        placeholder="Select a connection status"
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Account handle</FieldLabel>
                      <Input defaultValue={destination.accountHandle || ""} name="accountHandle" />
                    </Field>
                  </FieldGrid>

                  <FormSection>
                    <FormSectionTitle>Connection details</FormSectionTitle>
                    <FieldGrid>
                      <Field>
                        <FieldLabel>External account ID</FieldLabel>
                        <Input defaultValue={destination.externalAccountId || ""} name="externalAccountId" />
                      </Field>
                      <Field>
                        <FieldLabel>Update token</FieldLabel>
                        <Input
                          name="token"
                          placeholder={
                            destination.tokenHint
                              ? `Stored token ending ${destination.tokenHint}`
                              : "Paste a new token"
                          }
                        />
                      </Field>
                    </FieldGrid>
                    <CheckboxRow>
                      <CheckboxChip>
                        <input name="clearToken" type="checkbox" /> Clear stored token
                      </CheckboxChip>
                    </CheckboxRow>
                  </FormSection>

                  <FormSection>
                    <FormSectionTitle>Operational notes</FormSectionTitle>
                    <Field>
                      <FieldLabel>Connection error</FieldLabel>
                      <Textarea defaultValue={destination.connectionError || ""} name="connectionError" />
                    </Field>
                    <Field>
                      <FieldLabel>Settings JSON</FieldLabel>
                      <Textarea
                        defaultValue={JSON.stringify(destination.settingsJson || {}, null, 2)}
                        name="settingsJson"
                      />
                    </Field>
                    <ButtonRow>
                      <PrimaryButton type="submit">Save destination</PrimaryButton>
                    </ButtonRow>
                    <SmallText>
                      Streams linked: {(destination.streams || []).map((stream) => stream.name).join(", ") || "None"}
                    </SmallText>
                  </FormSection>
                </form>
              </RecordCard>
            ))}
          </RecordStack>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add destination</CardTitle>
            <CardDescription>
              Website and social endpoints can be managed independently and connected to multiple streams.
            </CardDescription>
          </CardHeader>
          <form action={saveDestinationAction}>
            <FieldGrid>
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input name="name" required />
              </Field>
              <Field>
                <FieldLabel>Slug</FieldLabel>
                <Input name="slug" required />
              </Field>
              <Field as="div">
                <FieldLabel>Platform</FieldLabel>
                <SearchableSelect
                  ariaLabel="Platform"
                  defaultValue="WEBSITE"
                  name="platform"
                  options={platformOptions}
                  placeholder="Select a platform"
                />
              </Field>
              <Field as="div">
                <FieldLabel>Kind</FieldLabel>
                <SearchableSelect
                  ariaLabel="Destination kind"
                  defaultValue="WEBSITE"
                  name="kind"
                  options={kindOptions}
                  placeholder="Select a destination kind"
                />
              </Field>
            </FieldGrid>
            <FormSection>
              <FormSectionTitle>Save record</FormSectionTitle>
              <ButtonRow>
                <PrimaryButton type="submit">Create destination</PrimaryButton>
              </ButtonRow>
            </FormSection>
          </form>
        </Card>
      </SectionGrid>
    </AdminPage>
  );
}
