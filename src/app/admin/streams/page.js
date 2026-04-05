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
  Select,
} from "@/components/admin/news-admin-ui";
import { getStreamManagementSnapshot } from "@/features/streams";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { runStreamNowAction, saveStreamAction } from "../actions";

const modeValues = ["AUTO_PUBLISH", "REVIEW_REQUIRED"];
const statusValues = ["ACTIVE", "PAUSED"];

function getTone(status) {
  return status === "ACTIVE" ? "success" : "warning";
}

export default async function StreamsPage() {
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getStreamManagementSnapshot(),
  ]);
  const copy = messages.admin.streams;

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
                <Field>
                  <FieldLabel>Destination</FieldLabel>
                  <Select defaultValue={stream.destinationId} name="destinationId">
                    {snapshot.destinations.map((destination) => (
                      <option key={destination.id} value={destination.id}>
                        {destination.name} ({destination.platform})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Provider</FieldLabel>
                  <Select defaultValue={stream.activeProviderId} name="activeProviderId">
                    {snapshot.providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Mode</FieldLabel>
                  <Select defaultValue={stream.mode} name="mode">
                    {modeValues.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Select defaultValue={stream.status} name="status">
                    {statusValues.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </Select>
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
                <Field>
                  <FieldLabel>Default template</FieldLabel>
                  <Select defaultValue={stream.defaultTemplateId || ""} name="defaultTemplateId">
                    <option value="">No explicit template</option>
                    {snapshot.templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.platform})
                      </option>
                    ))}
                  </Select>
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
              <Field style={{ marginTop: "0.85rem" }}>
                <FieldLabel>Categories</FieldLabel>
                <Select defaultValue={stream.streamCategories.map((category) => category.id)} multiple name="categoryIds" style={{ minHeight: "160px" }}>
                  {snapshot.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <ButtonRow style={{ marginTop: "0.85rem" }}>
                <PrimaryButton type="submit">Save stream</PrimaryButton>
              </ButtonRow>
              <ButtonRow style={{ marginTop: "0.65rem" }}>
                <form action={runStreamNowAction}>
                  <input name="streamId" type="hidden" value={stream.id} />
                  <SecondaryButton type="submit">Run now</SecondaryButton>
                </form>
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
              <Field>
                <FieldLabel>Destination</FieldLabel>
                <Select name="destinationId">
                  {snapshot.destinations.map((destination) => (
                    <option key={destination.id} value={destination.id}>
                      {destination.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                <FieldLabel>Provider</FieldLabel>
                <Select name="activeProviderId">
                  {snapshot.providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                <FieldLabel>Mode</FieldLabel>
                <Select defaultValue="REVIEW_REQUIRED" name="mode">
                  {modeValues.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
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
