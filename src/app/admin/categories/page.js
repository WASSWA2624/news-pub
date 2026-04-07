import {
  ActionIcon,
  AdminEyebrow,
  AdminHero,
  AdminHeroHeading,
  AdminMetricCard,
  AdminPage,
  AdminSectionTitle,
  ButtonIcon,
  Card,
  CardHeader,
  CardDescription,
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
import AdminFormModal, { AdminModalFooterActions } from "@/components/admin/admin-form-modal";
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
  flex-wrap: nowrap;
  gap: 0.45rem;

  > form {
    display: inline-flex;
  }

  @media (max-width: 980px) {
    flex-wrap: wrap;
  }
`;

const CategoriesTable = styled(DataTable)`
  border-collapse: separate;
  border-spacing: 0 0.5rem;

  thead th {
    border-bottom: 1px solid rgba(16, 32, 51, 0.08);
    padding-bottom: 0.7rem;
  }

  tbody td {
    background:
      linear-gradient(180deg, rgba(249, 251, 255, 0.98), rgba(255, 255, 255, 0.96)),
      radial-gradient(circle at top right, rgba(15, 111, 141, 0.05), transparent 42%);
    border-bottom: none;
    border-top: 1px solid rgba(16, 32, 51, 0.07);
    padding: 0.72rem 0.7rem;
    vertical-align: middle;
  }

  tbody tr td:first-child {
    border-bottom-left-radius: ${({ theme }) => theme.radius.lg};
    border-left: 1px solid rgba(16, 32, 51, 0.08);
    border-top-left-radius: ${({ theme }) => theme.radius.lg};
    padding-left: 1rem;
  }

  tbody tr td:last-child {
    border-bottom-right-radius: ${({ theme }) => theme.radius.lg};
    border-right: 1px solid rgba(16, 32, 51, 0.08);
    border-top-right-radius: ${({ theme }) => theme.radius.lg};
    padding-right: 1rem;
  }

  tbody tr {
    transition: transform 160ms ease;
  }

  tbody tr:hover td {
    background:
      linear-gradient(180deg, rgba(245, 249, 255, 1), rgba(255, 255, 255, 0.98)),
      radial-gradient(circle at top right, rgba(15, 111, 141, 0.08), transparent 44%);
    box-shadow: 0 16px 30px rgba(16, 32, 51, 0.05);
  }

  @media (max-width: 719px) {
    border-spacing: 0;

    tbody td {
      background: transparent;
      border-top: none;
      box-shadow: none;
      padding: 0;
    }

    tbody tr td:first-child,
    tbody tr td:last-child {
      border-left: none;
      border-radius: 0;
      border-right: none;
      padding: 0;
    }

    tbody tr:hover td {
      background: transparent;
      box-shadow: none;
    }
  }
`;

const NameCell = styled.div`
  display: grid;
  gap: 0.15rem;
  min-width: 0;
`;

const CategoryName = styled.strong`
  color: #162744;
  font-size: 1rem;
  letter-spacing: -0.03em;
  line-height: 1.1;
`;

const CountValue = styled.span`
  color: #162744;
  display: inline-flex;
  font-size: 1.02rem;
  font-weight: 800;
  line-height: 1;
`;

const TableActionModal = styled(AdminFormModal)`
  min-width: 4.8rem;
`;

const TableDeleteButton = styled(ConfirmSubmitButton)`
  min-width: 5.2rem;
`;

function CategoryEditorForm({ category = null, formId, submitLabel }) {
  return (
    <CategoryForm action={saveCategoryAction} id={formId}>
      {category ? <input name="id" type="hidden" value={category.id} /> : null}
      <FieldGrid>
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input defaultValue={category?.name || ""} name="name" required />
        </Field>
        <Field>
          <FieldLabel>Slug</FieldLabel>
          <Input
            defaultValue={category?.slug || ""}
            name="slug"
            placeholder="Auto-suggested from the category name"
            spellCheck={false}
          />
          <SmallText>Leave blank to use the cleaned SEO-friendly slug suggestion.</SmallText>
        </Field>
      </FieldGrid>
      <Field>
        <FieldLabel>Description</FieldLabel>
        <Textarea defaultValue={category?.description || ""} name="description" />
      </Field>
      <AdminModalFooterActions>
        <PrimaryButton form={formId} type="submit">
          <ButtonIcon>
            <ActionIcon name={category ? "save" : "plus"} />
          </ButtonIcon>
          {submitLabel}
        </PrimaryButton>
      </AdminModalFooterActions>
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
        <AdminHeroHeading description={copy.description} icon="categories" title={copy.title} />
      </AdminHero>

      <SummaryGrid>
        <AdminMetricCard icon="categories" label="Total categories" value={snapshot.summary.totalCount} />
        <AdminMetricCard icon="news" label="Post assignments" value={snapshot.summary.totalAssignments} />
        <AdminMetricCard icon="streams" label="Stream assignments" value={snapshot.summary.totalStreamAssignments} />
      </SummaryGrid>

      <SectionGrid>
        <Card>
          <CardHeader>
            <AdminSectionTitle icon="tag">Current categories</AdminSectionTitle>
            <CardDescription>Review taxonomy usage before removing a category from the editorial system.</CardDescription>
          </CardHeader>
          <DataTableWrap>
            <CategoriesTable>
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
                      <NameCell>
                        <CategoryName>{category.name}</CategoryName>
                        <SmallText>{category.description || "No description provided yet."}</SmallText>
                      </NameCell>
                    </td>
                    <td data-label="Slug">{category.slug}</td>
                    <td data-label="Posts">
                      <CountValue>{category.postCount}</CountValue>
                    </td>
                    <td data-label="Streams">
                      <CountValue>{category.streamCount}</CountValue>
                    </td>
                    <td data-label="Actions">
                      <ActionCluster>
                        <TableActionModal
                          description="Update the category name, slug, and description without leaving the taxonomy table."
                          size="compact"
                          title={`Edit ${category.name}`}
                          triggerIcon="edit"
                          triggerLabel="Edit"
                        >
                          <CategoryEditorForm
                            category={category}
                            formId={`category-form-${category.id}`}
                            submitLabel="Save category"
                          />
                        </TableActionModal>
                        <form action={deleteCategoryAction}>
                          <input name="id" type="hidden" value={category.id} />
                          <TableDeleteButton
                            confirmLabel="Delete category"
                            description={`This will permanently remove ${category.name}. Make sure it is no longer needed by stories or streams.`}
                            title="Delete this category?"
                          >
                            Delete
                          </TableDeleteButton>
                        </form>
                      </ActionCluster>
                    </td>
                  </tr>
                ))}
              </tbody>
            </CategoriesTable>
          </DataTableWrap>
        </Card>

        <Card>
          <CardHeader>
            <AdminSectionTitle icon="plus">Create category</AdminSectionTitle>
            <CardDescription>Categories drive stream filters, landing pages, and website discovery.</CardDescription>
          </CardHeader>
          <SmallText>
            Supported categories from the configured provider docs are preloaded automatically, and new entries get a
            cleaned SEO slug when you leave the slug field blank.
          </SmallText>
          <AdminFormModal
            description="Create a category with a clean compact form that fits the taxonomy workflow."
            size="compact"
            title="Create category"
            triggerFullWidth
            triggerIcon="plus"
            triggerLabel="New category"
            triggerTone="primary"
          >
            <CategoryEditorForm formId="category-form-create" submitLabel="Create category" />
          </AdminFormModal>
        </Card>
      </SectionGrid>
    </AdminPage>
  );
}
