import {
  AdminEyebrow,
  AdminHero,
  AdminHeroHeading,
  AdminMetricCard,
  AdminPage,
  AdminSectionTitle,
  ButtonRow,
  Card,
  CardToolbar,
  CardHeader,
  CardDescription,
  MetaPill,
  PillRow,
  RecordCard,
  RecordHeader,
  RecordMeta,
  RecordStack,
  RecordTitle,
  RecordTitleBlock,
  SectionGrid,
  SmallText,
  StickySideCard,
  StickySideCardBody,
  StickySideCardHeader,
  SummaryGrid,
  formatEnumLabel,
} from "@/components/admin/news-admin-ui";
import AdminFormModal from "@/components/admin/admin-form-modal";
import TemplateFormCard from "@/components/admin/template-form-card";
import { getTemplateManagementSnapshot } from "@/features/templates";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import styled from "styled-components";
import { saveTemplateAction } from "../actions";

const HeroLayout = styled.div`
  display: grid;
  gap: 0.9rem;

  @media (min-width: 980px) {
    align-items: end;
    grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  }
`;

const HeroStats = styled.div`
  display: grid;
  gap: 0.6rem;

  @media (min-width: 560px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const HeroStat = styled.div`
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: var(--theme-radius-lg, 2px);
  display: grid;
  gap: 0.22rem;
  padding: 0.78rem 0.85rem;
`;

const HeroStatValue = styled.strong`
  color: #122847;
  font-size: clamp(1rem, 3vw, 1.35rem);
  letter-spacing: -0.04em;
`;

const HeroStatLabel = styled.span`
  color: rgba(72, 85, 108, 0.9);
  font-size: 0.75rem;
  line-height: 1.4;
`;

const StudioGuide = styled.div`
  background:
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.14), transparent 46%),
    linear-gradient(180deg, rgba(17, 39, 66, 0.98), rgba(19, 55, 82, 0.96));
  border-radius: var(--theme-radius-lg, 2px);
  color: white;
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
`;

const GuideEyebrow = styled.span`
  color: rgba(192, 233, 242, 0.88);
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const GuideTitle = styled.h2`
  font-size: 1rem;
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin: 0;
`;

const GuideText = styled.p`
  color: rgba(229, 239, 248, 0.9);
  font-size: 0.82rem;
  line-height: 1.5;
  margin: 0;
`;

const GuideList = styled.div`
  display: grid;
  gap: 0.45rem;
`;

const GuideItem = styled.div`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--theme-radius-md, 1px);
  display: grid;
  gap: 0.16rem;
  padding: 0.72rem;
`;

const GuideItemLabel = styled.strong`
  font-size: 0.8rem;
`;

const GuideItemText = styled.span`
  color: rgba(229, 239, 248, 0.82);
  font-size: 0.74rem;
  line-height: 1.42;
`;

const TemplateRecord = styled(RecordCard)`
  gap: 0.85rem;
  padding: 0.9rem;
`;

const RecordLead = styled.div`
  display: grid;
  gap: 0.4rem;
`;

const platformValues = ["WEBSITE", "FACEBOOK", "INSTAGRAM"];
const platformOptions = platformValues.map((value) => ({
  badge: value,
  description: `${formatEnumLabel(value)} publishing template`,
  label: formatEnumLabel(value),
  value,
}));

/**
 * Renders the template management route with shared directory cards, a sticky
 * create panel, and full-workspace editing modals.
 *
 * @returns {Promise<JSX.Element>} The templates route.
 */
export default async function TemplatesPage() {
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getTemplateManagementSnapshot(),
  ]);
  const copy = messages.admin.templates;
  const localeOverrideCount = snapshot.templates.filter((template) => Boolean(template.locale)).length;
  const categoryOverrideCount = snapshot.templates.filter((template) => Boolean(template.categoryId)).length;
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
        <HeroLayout>
          <div>
            <AdminEyebrow>{messages.admin.title}</AdminEyebrow>
            <AdminHeroHeading description={copy.description} icon="templates" title={copy.title} />
          </div>

          <HeroStats>
            <HeroStat>
              <HeroStatValue>{snapshot.summary.totalCount}</HeroStatValue>
              <HeroStatLabel>Templates currently available to the resolver.</HeroStatLabel>
            </HeroStat>
            <HeroStat>
              <HeroStatValue>{snapshot.summary.defaultCount}</HeroStatValue>
              <HeroStatLabel>Platform defaults covering the last fallback step.</HeroStatLabel>
            </HeroStat>
            <HeroStat>
              <HeroStatValue>{categoryOverrideCount}</HeroStatValue>
              <HeroStatLabel>Category-specific variants for high-context publishing.</HeroStatLabel>
            </HeroStat>
            <HeroStat>
              <HeroStatValue>{localeOverrideCount}</HeroStatValue>
              <HeroStatLabel>Locale-specific variants tailored to audience language.</HeroStatLabel>
            </HeroStat>
          </HeroStats>
        </HeroLayout>
      </AdminHero>

      <SummaryGrid>
        <AdminMetricCard icon="templates" label="Total templates" value={snapshot.summary.totalCount} />
        <AdminMetricCard icon="badge-check" label="Platform defaults" value={snapshot.summary.defaultCount} />
        <AdminMetricCard icon="globe" label="Supported publishing surfaces" value={platformValues.length} />
      </SummaryGrid>

      <StudioGuide>
        <GuideEyebrow>Template studio</GuideEyebrow>
        <GuideTitle>Design templates around intent, not around one-off post formatting.</GuideTitle>
        <GuideText>
          Keep one calm default per platform, then layer category and locale variants only where editorial voice or destination behavior changes.
        </GuideText>
        <GuideList>
          <GuideItem>
            <GuideItemLabel>Start broad</GuideItemLabel>
            <GuideItemText>Every platform should have a dependable fallback template before you introduce overrides.</GuideItemText>
          </GuideItem>
          <GuideItem>
            <GuideItemLabel>Override with purpose</GuideItemLabel>
            <GuideItemText>Category and locale variants work best when they reflect a genuine copy or compliance need.</GuideItemText>
          </GuideItem>
          <GuideItem>
            <GuideItemLabel>Keep streams aligned</GuideItemLabel>
            <GuideItemText>Linked streams lock platform choice, so template edits stay compatible with real destinations.</GuideItemText>
          </GuideItem>
        </GuideList>
      </StudioGuide>

      <SectionGrid $wide>
        <Card>
          <CardToolbar>
            <CardHeader>
              <AdminSectionTitle icon="templates">Configured templates</AdminSectionTitle>
              <CardDescription>
                Each template card now surfaces where it wins in the fallback chain before you edit the actual content.
              </CardDescription>
            </CardHeader>
            <PillRow>
              {platformValues.map((platform) => (
                <MetaPill key={platform} $tone="accent">
                  {formatEnumLabel(platform)}
                </MetaPill>
              ))}
            </PillRow>
          </CardToolbar>
          <RecordStack>
            {snapshot.templates.map((template) => (
              <TemplateRecord key={template.id}>
                <RecordHeader>
                  <RecordTitleBlock as={RecordLead}>
                    <RecordTitle>{template.name}</RecordTitle>
                    <SmallText>
                      {template.category?.name || template.locale || "Platform-level template"}
                    </SmallText>
                    <PillRow>
                      <MetaPill $tone="accent">{formatEnumLabel(template.platform)}</MetaPill>
                      <MetaPill>{template.category?.name || "No category override"}</MetaPill>
                      <MetaPill>{template.locale || "All locales"}</MetaPill>
                    </PillRow>
                  </RecordTitleBlock>
                  <RecordMeta>
                    <MetaPill>{formatEnumLabel(template.platform)}</MetaPill>
                    {template.isDefault ? <MetaPill>Default</MetaPill> : null}
                  </RecordMeta>
                </RecordHeader>
                <SmallText>
                  Resolution rules and content blocks now open in a larger modal so fallback logic stays readable while editing.
                </SmallText>
                <ButtonRow>
                  <AdminFormModal
                    description="Adjust template precedence, platform compatibility, and content blocks in a scrollable full-size editor."
                    size="full"
                    title={`Edit ${template.name}`}
                    triggerIcon="edit"
                    triggerLabel="Edit template"
                  >
                    <TemplateFormCard
                      action={saveTemplateAction}
                      categoryOptions={categoryOptions}
                      platformOptions={platformOptions}
                      submitLabel="Save template"
                      template={template}
                    />
                  </AdminFormModal>
                </ButtonRow>
              </TemplateRecord>
            ))}
          </RecordStack>
        </Card>

        <StickySideCard>
          <StickySideCardHeader>
            <AdminSectionTitle icon="plus">Add template</AdminSectionTitle>
            <CardDescription>
              Template selection follows stream, platform plus category, platform plus locale, then platform default.
            </CardDescription>
          </StickySideCardHeader>
          <StickySideCardBody>
            <SmallText>
              Start a new template in a full-space modal when you need room for longer body copy and override rules.
            </SmallText>
            <ButtonRow>
              <AdminFormModal
                description="Create a new publishing template with platform, locale, category, and content-block controls in one place."
                size="full"
                title="Create template"
                triggerFullWidth
                triggerIcon="plus"
                triggerLabel="New template"
                triggerTone="primary"
              >
                <TemplateFormCard
                  action={saveTemplateAction}
                  categoryOptions={categoryOptions}
                  platformOptions={platformOptions}
                  submitLabel="Create template"
                />
              </AdminFormModal>
            </ButtonRow>
          </StickySideCardBody>
        </StickySideCard>
      </SectionGrid>
    </AdminPage>
  );
}
