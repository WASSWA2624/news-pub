import Link from "next/link";
import styled from "styled-components";

import PublicViewTracker from "@/components/analytics/public-view-tracker";
import ShareActions from "@/components/public/share-actions";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";

function formatDateLabel(locale, value) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function buildHref(pathname, searchParams = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    params.set(key, `${value}`);
  }

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

const PageMain = styled.main`
  display: grid;
  gap: clamp(1.2rem, 2.8vw, 1.8rem);
  margin: 0 auto;
  max-width: 1260px;
  padding: clamp(1.35rem, 3vw, 2.1rem) clamp(1rem, 3vw, 1.5rem) clamp(2rem, 4vw, 3rem);
  width: 100%;
`;

const Hero = styled.section`
  background:
    radial-gradient(circle at top left, rgba(11, 107, 139, 0.18), transparent 34%),
    radial-gradient(circle at 85% 20%, rgba(251, 195, 61, 0.14), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 255, 0.94));
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 18px;
  box-shadow:
    0 24px 52px rgba(16, 32, 51, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  display: grid;
  gap: 0.8rem;
  padding: clamp(1.2rem, 3vw, 2rem);
`;

const Eyebrow = styled.p`
  color: rgba(14, 88, 121, 0.8);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  margin: 0;
  text-transform: uppercase;
`;

const Title = styled.h1`
  color: #182742;
  font-size: clamp(2.3rem, 6vw, 4rem);
  letter-spacing: -0.05em;
  line-height: 0.98;
  margin: 0;
  max-width: 14ch;
`;

const Description = styled.p`
  color: rgba(71, 84, 108, 0.95);
  font-size: clamp(1rem, 2.4vw, 1.12rem);
  line-height: 1.7;
  margin: 0;
  max-width: 58ch;
`;

const SummaryGrid = styled.div`
  display: grid;
  gap: 0.9rem;

  @media (min-width: 760px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const SummaryCard = styled.article`
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 14px;
  display: grid;
  gap: 0.2rem;
  padding: 0.9rem 1rem;
`;

const SummaryValue = styled.strong`
  color: #132949;
  font-size: 1.35rem;
`;

const SummaryLabel = styled.span`
  color: rgba(74, 88, 113, 0.82);
  font-size: 0.9rem;
`;

const ContentGrid = styled.div`
  display: grid;
  gap: 1.1rem;

  @media (min-width: 980px) {
    align-items: start;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  }
`;

const Panel = styled.section`
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 18px;
  box-shadow: 0 18px 42px rgba(18, 34, 58, 0.06);
  display: grid;
  gap: 1rem;
  padding: clamp(1rem, 2.3vw, 1.35rem);
`;

const SectionTitle = styled.h2`
  color: #1a2946;
  font-size: 1.25rem;
  letter-spacing: -0.03em;
  margin: 0;
`;

const StoryGrid = styled.div`
  display: grid;
  gap: 0.95rem;
`;

const StoryCard = styled.article`
  background:
    linear-gradient(180deg, rgba(252, 253, 255, 0.98), rgba(246, 249, 255, 0.94)),
    radial-gradient(circle at top right, rgba(11, 107, 139, 0.08), transparent 48%);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 16px;
  display: grid;
  gap: 0.8rem;
  overflow: hidden;
`;

const StoryImageWrap = styled.div`
  background: linear-gradient(180deg, rgba(17, 43, 67, 0.04), rgba(17, 43, 67, 0.08));
  min-height: 210px;
`;

const StoryImage = styled.img`
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
`;

const StoryBody = styled.div`
  display: grid;
  gap: 0.75rem;
  padding: 1rem 1rem 1.05rem;
`;

const StoryTitleLink = styled(Link)`
  color: #152744;
  font-size: 1.18rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.15;
`;

const StorySummary = styled.p`
  color: rgba(72, 85, 110, 0.95);
  line-height: 1.62;
  margin: 0;
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 0.75rem;
`;

const MetaBadge = styled.span`
  color: rgba(53, 71, 99, 0.9);
  font-size: 0.82rem;
  font-weight: 700;
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
`;

const ChipLink = styled(Link)`
  background: rgba(15, 103, 133, 0.08);
  border: 1px solid rgba(15, 103, 133, 0.12);
  border-radius: 999px;
  color: #0d6685;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.36rem 0.7rem;
`;

const SidebarList = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const SidebarLink = styled(Link)`
  color: #152744;
  display: grid;
  gap: 0.22rem;
`;

const SidebarTitle = styled.span`
  font-weight: 800;
  letter-spacing: -0.02em;
`;

const SidebarMeta = styled.span`
  color: rgba(72, 85, 110, 0.88);
  font-size: 0.88rem;
`;

const EmptyState = styled.p`
  color: rgba(72, 85, 110, 0.9);
  line-height: 1.6;
  margin: 0;
`;

const PaginationRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  justify-content: space-between;
`;

const PaginationLink = styled(Link)`
  background: rgba(16, 32, 51, 0.04);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 999px;
  color: #152744;
  font-weight: 700;
  padding: 0.55rem 0.95rem;
`;

const SearchForm = styled.form`
  display: grid;
  gap: 0.75rem;

  @media (min-width: 620px) {
    grid-template-columns: minmax(0, 1fr) auto;
  }
`;

const SearchInput = styled.input`
  background: white;
  border: 1px solid rgba(16, 32, 51, 0.12);
  border-radius: 12px;
  min-height: 48px;
  padding: 0.8rem 0.95rem;
`;

const ActionButton = styled.button`
  background: linear-gradient(135deg, #0f6e8d 0%, #0b5871 100%);
  border: none;
  border-radius: 999px;
  color: white;
  cursor: pointer;
  font-weight: 800;
  min-height: 48px;
  padding: 0.75rem 1.1rem;
`;

const StoryHero = styled(Hero)`
  gap: 1rem;
`;

const StoryTitle = styled.h1`
  color: #172744;
  font-size: clamp(2.3rem, 6vw, 4.4rem);
  letter-spacing: -0.055em;
  line-height: 0.96;
  margin: 0;
  max-width: 16ch;
`;

const StoryLead = styled.p`
  color: rgba(69, 82, 106, 0.96);
  font-size: clamp(1.05rem, 2.3vw, 1.18rem);
  line-height: 1.72;
  margin: 0;
  max-width: 62ch;
`;

const StoryMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.95rem;
`;

const StoryImagePanel = styled.div`
  overflow: hidden;
`;

const StoryContent = styled.div`
  color: #22344f;
  line-height: 1.8;

  p {
    margin: 0 0 1rem;
  }

  h2,
  h3 {
    color: #142641;
    letter-spacing: -0.03em;
    margin: 1.5rem 0 0.75rem;
  }

  ul,
  ol {
    margin: 0 0 1rem 1.2rem;
    padding: 0;
  }

  a {
    color: #0c6987;
  }
`;

const LegalSection = styled.article`
  display: grid;
  gap: 0.75rem;
`;

const SectionBody = styled.div`
  color: rgba(69, 82, 106, 0.95);
  display: grid;
  gap: 0.7rem;
  line-height: 1.7;

  p,
  ul {
    margin: 0;
  }

  ul {
    padding-left: 1.2rem;
  }
`;

function StoryList({ emptyLabel, items = [], locale }) {
  if (!items.length) {
    return <EmptyState>{emptyLabel}</EmptyState>;
  }

  return (
    <StoryGrid>
      {items.map((item) => (
        <StoryCard key={item.id}>
          {item.image?.url ? (
            <StoryImageWrap>
              <StoryImage alt={item.image.alt} src={item.image.url} />
            </StoryImageWrap>
          ) : null}
          <StoryBody>
            <MetaRow>
              {item.publishedAt ? <MetaBadge>{formatDateLabel(locale, item.publishedAt)}</MetaBadge> : null}
              <MetaBadge>{item.sourceName}</MetaBadge>
            </MetaRow>
            <StoryTitleLink href={item.path}>{item.title}</StoryTitleLink>
            <StorySummary>{item.summary}</StorySummary>
            {item.categories?.length ? (
              <ChipRow>
                {item.categories.map((category) => (
                  <ChipLink href={category.path} key={category.slug}>
                    {category.name}
                  </ChipLink>
                ))}
              </ChipRow>
            ) : null}
          </StoryBody>
        </StoryCard>
      ))}
    </StoryGrid>
  );
}

export function PublicHomePage({ locale, messages, pageContent, pageData }) {
  const common = messages.common || {};

  return (
    <PageMain>
      <PublicViewTracker eventType="WEBSITE_VIEW" locale={locale} />
      <Hero>
        <Eyebrow>{pageContent.eyebrow || "Latest coverage"}</Eyebrow>
        <Title>{pageContent.title}</Title>
        <Description>{pageContent.description}</Description>
        <SummaryGrid>
          <SummaryCard>
            <SummaryValue>{pageData.summary.publishedStoryCount}</SummaryValue>
            <SummaryLabel>{common.resultsLabel || "Published stories"}</SummaryLabel>
          </SummaryCard>
          <SummaryCard>
            <SummaryValue>{pageData.summary.categoryCount}</SummaryValue>
            <SummaryLabel>{common.topCategoriesTitle || "Top categories"}</SummaryLabel>
          </SummaryCard>
          <SummaryCard>
            <SummaryValue>{pageData.latestStories.length + (pageData.featuredStory ? 1 : 0)}</SummaryValue>
            <SummaryLabel>{common.latestPostsTitle || "Latest stories"}</SummaryLabel>
          </SummaryCard>
        </SummaryGrid>
      </Hero>

      <ContentGrid>
        <div style={{ display: "grid", gap: "1.1rem" }}>
          {pageData.featuredStory ? (
            <Panel>
              <SectionTitle>{pageContent.featuredTitle || "Featured story"}</SectionTitle>
              <StoryList items={[pageData.featuredStory]} locale={locale} />
            </Panel>
          ) : null}

          <Panel>
            <SectionTitle>{pageContent.latestTitle || common.latestPostsTitle || "Latest stories"}</SectionTitle>
            <StoryList
              emptyLabel={common.emptyStateDescription || "Published stories will appear here soon."}
              items={pageData.latestStories}
              locale={locale}
            />
          </Panel>
        </div>

        <div style={{ display: "grid", gap: "1rem" }}>
          <Panel>
            <SectionTitle>{pageContent.discoveryTitle || common.topCategoriesTitle || "Top categories"}</SectionTitle>
            <SidebarList>
              {pageData.topCategories.map((category) => (
                <SidebarLink href={category.path} key={category.slug}>
                  <SidebarTitle>{category.name}</SidebarTitle>
                  <SidebarMeta>
                    {category.count} {(common.resultsLabel || "stories").toLowerCase()}
                  </SidebarMeta>
                </SidebarLink>
              ))}
            </SidebarList>
          </Panel>

          {pageData.featuredStory ? (
            <ShareActions
              compact
              description={common.shareDescription || "Share this story with your audience."}
              title={common.shareTitle || "Share"}
              url={pageData.featuredStory.path}
            />
          ) : null}
        </div>
      </ContentGrid>
    </PageMain>
  );
}

export function PublicCollectionPage({
  entity = null,
  locale,
  messages,
  pageContent,
  pageData,
  pathname,
  query = {},
  showSearch = false,
}) {
  const common = messages.common || {};

  return (
    <PageMain>
      <PublicViewTracker
        eventType={showSearch ? "SEARCH_VIEW" : "PAGE_VIEW"}
        locale={locale}
      />
      <Hero>
        <Eyebrow>{pageContent.eyebrow || "Published stories"}</Eyebrow>
        <Title>{entity?.name || pageContent.title}</Title>
        <Description>{entity?.description || pageContent.description}</Description>
      </Hero>

      <Panel>
        {showSearch ? (
          <SearchForm action={pathname} method="get">
            <SearchInput
              defaultValue={query.q || ""}
              name="q"
              placeholder={common.searchPlaceholder || "Search published stories"}
            />
            <ActionButton type="submit">{common.searchAction || "Search"}</ActionButton>
          </SearchForm>
        ) : null}

        <StoryList
          emptyLabel={common.emptyStateDescription || "Published stories will appear here soon."}
          items={pageData.items}
          locale={locale}
        />

        <PaginationRow>
          <MetaBadge>
            {pageData.pagination.startItem}-{pageData.pagination.endItem} / {pageData.pagination.totalItems}
          </MetaBadge>
          <MetaRow>
            {pageData.pagination.hasPreviousPage ? (
              <PaginationLink
                href={buildHref(pathname, {
                  ...query,
                  page: pageData.pagination.currentPage - 1,
                })}
              >
                {common.previousPage || "Previous"}
              </PaginationLink>
            ) : null}
            {pageData.pagination.hasNextPage ? (
              <PaginationLink
                href={buildHref(pathname, {
                  ...query,
                  page: pageData.pagination.currentPage + 1,
                })}
              >
                {common.nextPage || "Next"}
              </PaginationLink>
            ) : null}
          </MetaRow>
        </PaginationRow>
      </Panel>
    </PageMain>
  );
}

export function PublicStoryPage({ locale, messages, pageData }) {
  const common = messages.common || {};
  const article = pageData.article;

  return (
    <PageMain>
      <PublicViewTracker eventType="POST_VIEW" locale={locale} postId={article.id} />
      <StoryHero>
        <Eyebrow>{article.sourceName}</Eyebrow>
        <StoryTitle>{article.title}</StoryTitle>
        <StoryLead>{article.summary}</StoryLead>
        <StoryMeta>
          {article.publishedAt ? (
            <MetaBadge>{common.publishedLabel || "Published"} {formatDateLabel(locale, article.publishedAt)}</MetaBadge>
          ) : null}
          {article.updatedAt ? (
            <MetaBadge>{common.updatedLabel || "Updated"} {formatDateLabel(locale, article.updatedAt)}</MetaBadge>
          ) : null}
          <MetaBadge>{article.providerKey}</MetaBadge>
        </StoryMeta>
        {article.categories?.length ? (
          <ChipRow>
            {article.categories.map((category) => (
              <ChipLink href={category.path} key={category.slug}>
                {category.name}
              </ChipLink>
            ))}
          </ChipRow>
        ) : null}
      </StoryHero>

      <ContentGrid>
        <div style={{ display: "grid", gap: "1.1rem" }}>
          {article.image?.url ? (
            <Panel>
              <StoryImagePanel>
                <StoryImage alt={article.image.alt} src={article.image.url} />
              </StoryImagePanel>
            </Panel>
          ) : null}

          <Panel>
            <SectionTitle>{article.title}</SectionTitle>
            <StoryContent dangerouslySetInnerHTML={{ __html: article.contentHtml }} />
          </Panel>
        </div>

        <div style={{ display: "grid", gap: "1rem" }}>
          <Panel>
            <SectionTitle>{common.referencesHeading || "Source attribution"}</SectionTitle>
            <SidebarList>
              <SidebarLink href={article.sourceUrl} target="_blank">
                <SidebarTitle>{article.sourceName}</SidebarTitle>
                <SidebarMeta>{article.sourceUrl}</SidebarMeta>
              </SidebarLink>
            </SidebarList>
            <EmptyState>{article.sourceAttribution}</EmptyState>
          </Panel>

          <ShareActions
            compact
            description={common.shareDescription || "Share this story with your audience."}
            title={common.shareTitle || "Share this story"}
            url={article.canonicalUrl}
          />

          <Panel>
            <SectionTitle>{common.relatedPostsTitle || "Related stories"}</SectionTitle>
            <SidebarList>
              {pageData.relatedStories.length ? (
                pageData.relatedStories.map((story) => (
                  <SidebarLink href={story.path} key={story.id}>
                    <SidebarTitle>{story.title}</SidebarTitle>
                    <SidebarMeta>
                      {story.sourceName}
                      {story.publishedAt ? ` | ${formatDateLabel(locale, story.publishedAt)}` : ""}
                    </SidebarMeta>
                  </SidebarLink>
                ))
              ) : (
                <EmptyState>{common.emptyStateDescription || "More stories will appear here soon."}</EmptyState>
              )}
            </SidebarList>
          </Panel>
        </div>
      </ContentGrid>
    </PageMain>
  );
}

export function PublicStaticPage({ locale, pageContent }) {
  return (
    <PageMain>
      <PublicViewTracker eventType="PAGE_VIEW" locale={locale} />
      <Hero>
        <Eyebrow>{pageContent.eyebrow}</Eyebrow>
        <Title>{pageContent.title}</Title>
        <Description>{pageContent.description}</Description>
      </Hero>

      <Panel>
        {(pageContent.sections || []).map((section) => (
          <LegalSection key={section.title}>
            <SectionTitle>{section.title}</SectionTitle>
            <SectionBody>
              {(section.paragraphs || []).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {(section.items || []).length ? (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </SectionBody>
          </LegalSection>
        ))}
      </Panel>
    </PageMain>
  );
}
