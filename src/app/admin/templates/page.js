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
  MetaPill,
  RecordCard,
  RecordHeader,
  RecordMeta,
  RecordStack,
  RecordTitle,
  RecordTitleBlock,
  SectionGrid,
  SmallText,
  SummaryCard,
  SummaryGrid,
  SummaryLabel,
  SummaryValue,
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
  border-radius: 14px;
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
  border-radius: 18px;
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
  border-radius: 12px;
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

const StudioGrid = styled(SectionGrid)`
  @media (min-width: 1080px) {
    grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr);
  }
`;

const DirectoryHeader = styled.div`
  align-items: start;
  display: grid;
  gap: 0.75rem;

  @media (min-width: 860px) {
    grid-template-columns: minmax(0, 1fr) auto;
  }
`;

const PlatformRail = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`;

const PlatformChip = styled.span`
  align-items: center;
  background: rgba(15, 111, 141, 0.07);
  border: 1px solid rgba(15, 111, 141, 0.12);
  border-radius: 999px;
  color: #0d5f79;
  display: inline-flex;
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  min-height: 28px;
  padding: 0 0.7rem;
  text-transform: uppercase;
`;

const TemplateRecord = styled(RecordCard)`
  gap: 0.85rem;
  padding: 0.9rem;
`;

const RecordLead = styled.div`
  display: grid;
  gap: 0.4rem;
`;

const OverrideRail = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
`;

const OverridePill = styled.span`
  align-items: center;
  background: ${({ $tone }) =>
    $tone === "accent"
      ? "rgba(15, 111, 141, 0.08)"
      : "rgba(16, 32, 51, 0.05)"};
  border: 1px solid
    ${({ $tone }) =>
      $tone === "accent"
        ? "rgba(15, 111, 141, 0.14)"
        : "rgba(16, 32, 51, 0.08)"};
  border-radius: 999px;
  color: ${({ $tone }) => ($tone === "accent" ? "#0d5f79" : "#30435f")};
  display: inline-flex;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  min-height: 24px;
  padding: 0 0.55rem;
  text-transform: uppercase;
`;

const StickyCard = styled(Card)`
  align-self: start;
  position: sticky;
  top: 5.7rem;
`;

const platformValues = ["WEBSITE", "FACEBOOK", "INSTAGRAM"];
const platformOptions = platformValues.map((value) => ({
  badge: value,
  description: `${formatEnumLabel(value)} publishing template`,
  label: formatEnumLabel(value),
  value,
}));

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
            <AdminTitle>{copy.title}</AdminTitle>
            <AdminDescription>{copy.description}</AdminDescription>
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
        <SummaryCard>
          <SummaryValue>{snapshot.summary.totalCount}</SummaryValue>
          <SummaryLabel>Total templates</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.defaultCount}</SummaryValue>
          <SummaryLabel>Platform defaults</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{platformValues.length}</SummaryValue>
          <SummaryLabel>Supported publishing surfaces</SummaryLabel>
        </SummaryCard>
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

      <StudioGrid $wide>
        <Card>
          <DirectoryHeader>
            <CardHeader>
              <CardTitle>Configured templates</CardTitle>
              <CardDescription>
                Each template card now surfaces where it wins in the fallback chain before you edit the actual content.
              </CardDescription>
            </CardHeader>
            <PlatformRail>
              {platformValues.map((platform) => (
                <PlatformChip key={platform}>{formatEnumLabel(platform)}</PlatformChip>
              ))}
            </PlatformRail>
          </DirectoryHeader>
          <RecordStack>
            {snapshot.templates.map((template) => (
              <TemplateRecord key={template.id}>
                <RecordHeader>
                  <RecordTitleBlock as={RecordLead}>
                    <RecordTitle>{template.name}</RecordTitle>
                    <SmallText>
                      {template.category?.name || template.locale || "Platform-level template"}
                    </SmallText>
                    <OverrideRail>
                      <OverridePill $tone="accent">{formatEnumLabel(template.platform)}</OverridePill>
                      <OverridePill>{template.category?.name || "No category override"}</OverridePill>
                      <OverridePill>{template.locale || "All locales"}</OverridePill>
                    </OverrideRail>
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

        <StickyCard>
          <CardHeader>
            <CardTitle>Add template</CardTitle>
            <CardDescription>
              Template selection follows stream, platform plus category, platform plus locale, then platform default.
            </CardDescription>
          </CardHeader>
          <SmallText>
            Start a new template in a full-space modal when you need room for longer body copy and override rules.
          </SmallText>
          <ButtonRow>
            <AdminFormModal
              description="Create a new publishing template with platform, locale, category, and content-block controls in one place."
              size="full"
              title="Create template"
              triggerFullWidth
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
        </StickyCard>
      </StudioGrid>
    </AdminPage>
  );
}
