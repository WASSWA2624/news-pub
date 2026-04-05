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
  DataTable,
  DataTableWrap,
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
  SecondaryButton,
} from "@/components/admin/news-admin-ui";
import { getCategoryManagementSnapshot } from "@/features/categories";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { deleteCategoryAction, saveCategoryAction } from "../actions";

export default async function CategoriesPage() {
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getCategoryManagementSnapshot(),
  ]);
  const copy = messages.admin.categories;

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
          <SummaryLabel>Total categories</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.totalAssignments}</SummaryValue>
          <SummaryLabel>Post assignments</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.totalStreamAssignments}</SummaryValue>
          <SummaryLabel>Stream assignments</SummaryLabel>
        </SummaryCard>
      </SummaryGrid>

      <SectionGrid>
        <Card>
          <CardTitle>Current categories</CardTitle>
          <DataTableWrap>
            <DataTable>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Posts</th>
                  <th>Streams</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <strong>{category.name}</strong>
                      <SmallText>{category.description || "No description"}</SmallText>
                    </td>
                    <td>{category.slug}</td>
                    <td>{category.postCount}</td>
                    <td>{category.streamCount}</td>
                    <td>
                      <form action={deleteCategoryAction}>
                        <input name="id" type="hidden" value={category.id} />
                        <SecondaryButton type="submit">Delete</SecondaryButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </DataTableWrap>
        </Card>

        <Card>
          <CardTitle>Create or update category</CardTitle>
          <CardDescription>Categories drive stream filters, landing pages, and website discovery.</CardDescription>
          <form action={saveCategoryAction}>
            <FieldGrid>
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input name="name" required />
              </Field>
              <Field>
                <FieldLabel>Slug</FieldLabel>
                <Input name="slug" />
              </Field>
            </FieldGrid>
            <Field style={{ marginTop: "0.85rem" }}>
              <FieldLabel>Description</FieldLabel>
              <Textarea name="description" />
            </Field>
            <ButtonRow style={{ marginTop: "0.85rem" }}>
              <PrimaryButton type="submit">Save category</PrimaryButton>
            </ButtonRow>
          </form>
        </Card>
      </SectionGrid>
    </AdminPage>
  );
}
