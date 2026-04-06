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
} from "@/components/admin/news-admin-ui";
import AdminFormModal from "@/components/admin/admin-form-modal";
import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";
import { getCategoryManagementSnapshot } from "@/features/categories";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import styled from "styled-components";
import { deleteCategoryAction, saveCategoryAction } from "../actions";

const CategoryForm = styled.form`
  display: grid;
  gap: 0.85rem;
`;

const ActionCluster = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
`;

function CategoryEditorForm({ category = null, submitLabel }) {
  return (
    <CategoryForm action={saveCategoryAction}>
      {category ? <input name="id" type="hidden" value={category.id} /> : null}
      <FieldGrid>
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input defaultValue={category?.name || ""} name="name" required />
        </Field>
        <Field>
          <FieldLabel>Slug</FieldLabel>
          <Input defaultValue={category?.slug || ""} name="slug" />
        </Field>
      </FieldGrid>
      <Field>
        <FieldLabel>Description</FieldLabel>
        <Textarea defaultValue={category?.description || ""} name="description" />
      </Field>
      <PrimaryButton type="submit">{submitLabel}</PrimaryButton>
    </CategoryForm>
  );
}

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
          <CardHeader>
            <CardTitle>Current categories</CardTitle>
            <CardDescription>Review taxonomy usage before removing a category from the editorial system.</CardDescription>
          </CardHeader>
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
                    <td data-label="Name">
                      <strong>{category.name}</strong>
                      <SmallText>{category.description || "No description"}</SmallText>
                    </td>
                    <td data-label="Slug">{category.slug}</td>
                    <td data-label="Posts">{category.postCount}</td>
                    <td data-label="Streams">{category.streamCount}</td>
                    <td data-label="Actions">
                      <ActionCluster>
                        <AdminFormModal
                          description="Update the category name, slug, and description without leaving the taxonomy table."
                          size="compact"
                          title={`Edit ${category.name}`}
                          triggerLabel="Edit"
                        >
                          <CategoryEditorForm category={category} submitLabel="Save category" />
                        </AdminFormModal>
                        <form action={deleteCategoryAction}>
                          <input name="id" type="hidden" value={category.id} />
                          <ConfirmSubmitButton
                            confirmLabel="Delete category"
                            description={`This will permanently remove ${category.name}. Make sure it is no longer needed by stories or streams.`}
                            title="Delete this category?"
                          >
                            Delete
                          </ConfirmSubmitButton>
                        </form>
                      </ActionCluster>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </DataTableWrap>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create category</CardTitle>
            <CardDescription>Categories drive stream filters, landing pages, and website discovery.</CardDescription>
          </CardHeader>
          <SmallText>
            Open a compact modal to add a new taxonomy entry while keeping the category inventory visible.
          </SmallText>
          <AdminFormModal
            description="Create a category with a clean compact form that fits the taxonomy workflow."
            size="compact"
            title="Create category"
            triggerFullWidth
            triggerLabel="New category"
            triggerTone="primary"
          >
            <CategoryEditorForm submitLabel="Save category" />
          </AdminFormModal>
        </Card>
      </SectionGrid>
    </AdminPage>
  );
}
