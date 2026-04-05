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
  SecondaryButton,
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
import { getStreamManagementSnapshot } from "@/features/streams";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { runStreamNowAction, saveStreamAction } from "../actions";

const modeValues = ["AUTO_PUBLISH", "REVIEW_REQUIRED"];
const statusValues = ["ACTIVE", "PAUSED"];
const modeOptions = modeValues.map((value) => ({
  description:
    value === "AUTO_PUBLISH"
      ? "Eligible stories can move straight into publishing."
      : "Stories stay queued for editorial review before publishing.",
  label: formatEnumLabel(value),
  value,
}));
const statusOptions = statusValues.map((value) => ({
  description:
    value === "ACTIVE"
      ? "The stream can run on schedule or manually."
      : "The stream is configured but currently paused.",
  label: formatEnumLabel(value),
  value,
}));

function getTone(status) {
  return status === "ACTIVE" ? "success" : "warning";
}

export default async function StreamsPage() {
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getStreamManagementSnapshot(),
  ]);
  const copy = messages.admin.streams;
  const destinationOptions = snapshot.destinations.map((destination) => ({
    badge: destination.platform,
    description: destination.slug,
    label: destination.name,
    value: destination.id,
  }));
  const providerOptions = snapshot.providers.map((provider) => ({
    badge: provider.providerKey,
    description: provider.description || provider.baseUrl || "Configured provider",
    label: provider.label,
    value: provider.id,
  }));
  const templateOptions = [
    {
      description: "Let NewsPub resolve the best template from platform, locale, and category defaults.",
      label: "No explicit template",
      value: "",
    },
    ...snapshot.templates.map((template) => ({
      badge: template.platform,
      description: template.locale ? `Locale override: ${template.locale}` : "Platform-aware template",
      label: template.name,
      value: template.id,
    })),
  ];
  const categoryOptions = snapshot.categories.map((category) => ({
    description: category.description || "Assign this stream to the category.",
    label: category.name,
    value: category.id,
  }));

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
          <SummaryLabel>Total streams</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.activeCount}</SummaryValue>
          <SummaryLabel>Active streams</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.pausedCount}</SummaryValue>
          <SummaryLabel>Paused streams</SummaryLabel>
        </SummaryCard>
      </SummaryGrid>

      <SectionGrid>
        <Card>
          <CardTitle>Configured streams</CardTitle>
          {snapshot.streams.map((stream) => (
            <form action={saveStreamAction} key={stream.id}>
              <FieldGrid>
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <Input defaultValue={stream.name} name="name" required />
                </Field>
                <Field>
                  <FieldLabel>Slug</FieldLabel>
                  <Input defaultValue={stream.slug} name="slug" required />
                </Field>
                <Field as="div">
                  <FieldLabel>Destination</FieldLabel>
                  <SearchableSelect
                    ariaLabel="Destination"
                    defaultValue={stream.destinationId}
                    name="destinationId"
                    options={destinationOptions}
                    placeholder="Select a destination"
                  />
                </Field>
                <Field as="div">
                  <FieldLabel>Provider</FieldLabel>
                  <SearchableSelect
                    ariaLabel="Provider"
                    defaultValue={stream.activeProviderId}
                    name="activeProviderId"
                    options={providerOptions}
                    placeholder="Select a provider"
                  />
                </Field>
                <Field as="div">
                  <FieldLabel>Mode</FieldLabel>
                  <SearchableSelect
                    ariaLabel="Stream mode"
                    defaultValue={stream.mode}
                    name="mode"
                    options={modeOptions}
                    placeholder="Select a mode"
                  />
                </Field>
                <Field as="div">
                  <FieldLabel>Status</FieldLabel>
                  <SearchableSelect
                    ariaLabel="Stream status"
                    defaultValue={stream.status}
                    name="status"
                    options={statusOptions}
                    placeholder="Select a status"
                  />
                </Field>
                <Field>
                  <FieldLabel>Locale</FieldLabel>
                  <Input defaultValue={stream.locale} name="locale" required />
                </Field>
                <Field>
                  <FieldLabel>Timezone</FieldLabel>
                  <Input defaultValue={stream.timezone} name="timezone" required />
                </Field>
                <Field>
                  <FieldLabel>Schedule interval minutes</FieldLabel>
                  <Input defaultValue={stream.scheduleIntervalMinutes} name="scheduleIntervalMinutes" type="number" />
                </Field>
                <Field>
                  <FieldLabel>Schedule expression</FieldLabel>
                  <Input defaultValue={stream.scheduleExpression || ""} name="scheduleExpression" />
                </Field>
                <Field>
                  <FieldLabel>Max posts per run</FieldLabel>
                  <Input defaultValue={stream.maxPostsPerRun} name="maxPostsPerRun" type="number" />
                </Field>
                <Field>
                  <FieldLabel>Duplicate window hours</FieldLabel>
                  <Input defaultValue={stream.duplicateWindowHours} name="duplicateWindowHours" type="number" />
                </Field>
                <Field>
                  <FieldLabel>Retry limit</FieldLabel>
                  <Input defaultValue={stream.retryLimit} name="retryLimit" type="number" />
                </Field>
                <Field>
                  <FieldLabel>Retry backoff minutes</FieldLabel>
                  <Input defaultValue={stream.retryBackoffMinutes} name="retryBackoffMinutes" type="number" />
                </Field>
                <Field as="div">
                  <FieldLabel>Default template</FieldLabel>
                  <SearchableSelect
                    ariaLabel="Default template"
                    defaultValue={stream.defaultTemplateId || ""}
                    name="defaultTemplateId"
                    options={templateOptions}
                    placeholder="Select a template"
                  />
                </Field>
                <Field>
                  <FieldLabel>Current state</FieldLabel>
                  <div>
                    <StatusBadge $tone={getTone(stream.status)}>{stream.status}</StatusBadge>
                  </div>
                </Field>
              </FieldGrid>
              <Field style={{ marginTop: "0.85rem" }}>
                <FieldLabel>Description</FieldLabel>
                <Textarea defaultValue={stream.description || ""} name="description" />
              </Field>
              <Field style={{ marginTop: "0.85rem" }}>
                <FieldLabel>Include keywords</FieldLabel>
                <Textarea
                  defaultValue={(stream.includeKeywordsJson || []).join(", ")}
                  name="includeKeywordsJson"
                />
              </Field>
              <Field style={{ marginTop: "0.85rem" }}>
                <FieldLabel>Exclude keywords</FieldLabel>
                <Textarea
                  defaultValue={(stream.excludeKeywordsJson || []).join(", ")}
                  name="excludeKeywordsJson"
                />
              </Field>
              <Field as="div" style={{ marginTop: "0.85rem" }}>
                <FieldLabel>Categories</FieldLabel>
                <SearchableSelect
                  ariaLabel="Stream categories"
                  defaultValue={stream.streamCategories.map((category) => category.id)}
                  multiple
                  name="categoryIds"
                  options={categoryOptions}
                  placeholder="Select one or more categories"
                />
              </Field>
              <ButtonRow style={{ marginTop: "0.85rem" }}>
                <PrimaryButton type="submit">Save stream</PrimaryButton>
              </ButtonRow>
              <ButtonRow style={{ marginTop: "0.65rem" }}>
                <SecondaryButton formAction={runStreamNowAction} formNoValidate name="streamId" type="submit" value={stream.id}>
                  Run now
                </SecondaryButton>
                <SmallText>
                  Destination: {stream.destination?.name || "Unknown"} | Provider: {stream.activeProvider?.label || "Unknown"}
                </SmallText>
              </ButtonRow>
            </form>
          ))}
        </Card>

        <Card>
          <CardTitle>Add stream</CardTitle>
          <CardDescription>
            Streams define the destination-specific fetch window, filtering rules, mode, and cadence.
          </CardDescription>
          <form action={saveStreamAction}>
            <FieldGrid>
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input name="name" required />
              </Field>
              <Field>
                <FieldLabel>Slug</FieldLabel>
                <Input name="slug" />
              </Field>
              <Field as="div">
                <FieldLabel>Destination</FieldLabel>
                <SearchableSelect
                  ariaLabel="Destination"
                  defaultValue={snapshot.destinations[0]?.id || ""}
                  name="destinationId"
                  options={destinationOptions}
                  placeholder="Select a destination"
                />
              </Field>
              <Field as="div">
                <FieldLabel>Provider</FieldLabel>
                <SearchableSelect
                  ariaLabel="Provider"
                  defaultValue={snapshot.providers[0]?.id || ""}
                  name="activeProviderId"
                  options={providerOptions}
                  placeholder="Select a provider"
                />
              </Field>
              <Field as="div">
                <FieldLabel>Mode</FieldLabel>
                <SearchableSelect
                  ariaLabel="Stream mode"
                  defaultValue="REVIEW_REQUIRED"
                  name="mode"
                  options={modeOptions}
                  placeholder="Select a mode"
                />
              </Field>
              <Field>
                <FieldLabel>Locale</FieldLabel>
                <Input defaultValue="en" name="locale" required />
              </Field>
            </FieldGrid>
            <ButtonRow style={{ marginTop: "0.85rem" }}>
              <PrimaryButton type="submit">Create stream</PrimaryButton>
            </ButtonRow>
          </form>
        </Card>
      </SectionGrid>
    </AdminPage>
  );
}
