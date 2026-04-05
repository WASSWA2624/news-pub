"use client";

import styled from "styled-components";

const Page = styled.main`
  display: grid;
  gap: clamp(1rem, 2.1vw, 1.35rem);
  margin: 0 auto;
  max-width: 1360px;
  padding: clamp(1rem, 2.2vw, 1.45rem);
`;

const Hero = styled.section`
  background:
    radial-gradient(circle at top right, rgba(201, 123, 42, 0.16), transparent 42%),
    linear-gradient(135deg, rgba(0, 95, 115, 0.12), rgba(16, 32, 51, 0.03));
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  display: grid;
  gap: 0.72rem;
  padding: clamp(1.05rem, 2.6vw, 1.45rem);
`;

const Eyebrow = styled.p`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  margin: 0;
  text-transform: uppercase;
`;

const Title = styled.h1`
  font-size: clamp(1.85rem, 4.7vw, 2.8rem);
  line-height: 1;
  margin: 0;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.98rem;
  line-height: 1.58;
  margin: 0;
  max-width: 64ch;
`;

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Pill = styled.span`
  background: ${({ $tone }) =>
    $tone === "accent"
      ? "rgba(201, 123, 42, 0.18)"
      : $tone === "success"
        ? "rgba(21, 115, 71, 0.14)"
        : "rgba(0, 95, 115, 0.12)"};
  border-radius: 999px;
  display: inline-flex;
  font-size: 0.74rem;
  font-weight: 600;
  padding: 0.28rem 0.62rem;
`;

const SummaryGrid = styled.section`
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
`;

const SummaryCard = styled.section`
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 12px 34px rgba(16, 32, 51, 0.08);
  display: grid;
  gap: 0.22rem;
  padding: 0.92rem 1rem;
`;

const SummaryValue = styled.strong`
  font-size: clamp(1.55rem, 3vw, 2rem);
  line-height: 0.92;
`;

const SmallText = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.94rem;
  line-height: 1.45;
  margin: 0;
  overflow-wrap: anywhere;
`;

const Layout = styled.section`
  align-items: start;
  display: grid;
  gap: clamp(1rem, 2vw, 1.25rem);

  @media (min-width: 1120px) {
    grid-template-columns: minmax(0, 330px) minmax(0, 1fr);
  }
`;

const Stack = styled.div`
  align-content: start;
  display: grid;
  gap: clamp(0.95rem, 1.8vw, 1.2rem);
  min-width: 0;
`;

const Card = styled.section`
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 14px 38px rgba(16, 32, 51, 0.08);
  display: grid;
  gap: 0.78rem;
  min-width: 0;
  overflow: hidden;
  padding: clamp(0.95rem, 2.1vw, 1.15rem);
  position: relative;

  &::before {
    background: linear-gradient(90deg, rgba(0, 95, 115, 0.16), rgba(201, 123, 42, 0.12));
    content: "";
    height: 3px;
    inset: 0 0 auto;
    position: absolute;
  }
`;

const CardTitle = styled.h2`
  font-size: 1.05rem;
  margin: 0;
`;

const MetaGrid = styled.dl`
  display: grid;
  gap: 0.78rem;
  min-width: 0;
`;

const MetaItem = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  min-width: 0;
`;

const MetaTerm = styled.dt`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  margin: 0;
  text-transform: uppercase;
`;

const MetaValue = styled.dd`
  margin: 0;
  overflow-wrap: anywhere;
`;

const Anchor = styled.a`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const RouteList = styled.div`
  align-content: start;
  display: grid;
  gap: 0.7rem;
  min-width: 0;
`;

const RouteRow = styled.div`
  background: rgba(247, 249, 252, 0.92);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: 0.55rem;
  min-width: 0;
  padding: 0.82rem 0.9rem;
`;

const RouteLabel = styled.strong`
  font-size: 1rem;
`;

const PostList = styled.div`
  align-content: start;
  display: grid;
  gap: 0.78rem;
  min-width: 0;
`;

const PostCard = styled.article`
  background: rgba(247, 249, 252, 0.92);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: 0.78rem;
  min-width: 0;
  overflow: hidden;
  padding: 0.95rem 1rem;
`;

const PostTitle = styled.h3`
  font-size: 1.1rem;
  margin: 0;
`;

const PostMetaGrid = styled.dl`
  align-items: start;
  display: grid;
  gap: 0.78rem;
  min-width: 0;

  @media (min-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

function formatRouteLabel(key) {
  if (key === "home") {
    return "Home";
  }

  return key.charAt(0).toUpperCase() + key.slice(1);
}

function renderAlternates(copy, alternateLocales) {
  if (!alternateLocales || !Object.keys(alternateLocales).length) {
    return copy.noAlternateLocales;
  }

  return Object.entries(alternateLocales)
    .map(([locale, url]) => `${locale}: ${url}`)
    .join(" | ");
}

export default function SeoManagementScreen({ copy, initialData }) {
  return (
    <Page>
      <Hero>
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Title>{copy.title}</Title>
        <Description>{copy.description}</Description>
        <BadgeRow>
          <Pill>{copy.siteUrlLabel}: {initialData.site.appUrl}</Pill>
          <Pill $tone="accent">
            {copy.supportedLocalesLabel}: {initialData.site.supportedLocales.join(", ")}
          </Pill>
          <Pill $tone={initialData.site.alternateLinksEnabled ? "success" : undefined}>
            {initialData.site.alternateLinksEnabled
              ? copy.alternateLinksEnabled
              : copy.alternateLinksDisabled}
          </Pill>
        </BadgeRow>
      </Hero>

      <SummaryGrid>
        <SummaryCard>
          <SummaryValue>{initialData.summary.publishedPostCount}</SummaryValue>
          <SmallText>{copy.publishedPostCountLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{initialData.summary.postPageCount}</SummaryValue>
          <SmallText>{copy.postPageCountLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{initialData.summary.categoryPageCount}</SummaryValue>
          <SmallText>{copy.categoryPageCountLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{initialData.summary.equipmentPageCount}</SummaryValue>
          <SmallText>{copy.equipmentPageCountLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{initialData.summary.manufacturerPageCount}</SummaryValue>
          <SmallText>{copy.manufacturerPageCountLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{initialData.summary.seoRecordCount}</SummaryValue>
          <SmallText>{copy.seoRecordCountLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{initialData.summary.faqPageCount}</SummaryValue>
          <SmallText>{copy.faqPageCountLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{initialData.summary.searchableStaticPageCount}</SummaryValue>
          <SmallText>{copy.indexableStaticPageCountLabel}</SmallText>
        </SummaryCard>
      </SummaryGrid>

      <Layout>
        <Stack>
          <Card>
            <CardTitle>{copy.siteCardTitle}</CardTitle>
            <MetaGrid>
              <MetaItem>
                <MetaTerm>{copy.siteUrlLabel}</MetaTerm>
                <MetaValue>{initialData.site.appUrl}</MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaTerm>{copy.supportedLocalesLabel}</MetaTerm>
                <MetaValue>{initialData.site.supportedLocales.join(", ")}</MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaTerm>Default locale</MetaTerm>
                <MetaValue>{initialData.site.defaultLocale}</MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaTerm>Alternate links</MetaTerm>
                <MetaValue>
                  {initialData.site.alternateLinksEnabled
                    ? copy.alternateLinksEnabled
                    : copy.alternateLinksDisabled}
                </MetaValue>
              </MetaItem>
            </MetaGrid>
          </Card>

          <Card>
            <CardTitle>{copy.crawlCardTitle}</CardTitle>
            <MetaGrid>
              <MetaItem>
                <MetaTerm>{copy.robotsLabel}</MetaTerm>
                <MetaValue>
                  <Anchor href={initialData.crawl.robotsUrl} rel="noreferrer" target="_blank">
                    {initialData.crawl.robotsUrl}
                  </Anchor>
                </MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaTerm>{copy.sitemapLabel}</MetaTerm>
                <MetaValue>
                  <Anchor href={initialData.crawl.sitemapUrl} rel="noreferrer" target="_blank">
                    {initialData.crawl.sitemapUrl}
                  </Anchor>
                </MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaTerm>{copy.disallowLabel}</MetaTerm>
                <MetaValue>{initialData.crawl.disallowPaths.join(", ")}</MetaValue>
              </MetaItem>
            </MetaGrid>
            <SmallText>{copy.searchNoindexHint}</SmallText>
          </Card>

          <Card>
            <CardTitle>{copy.staticRoutesTitle}</CardTitle>
            <SmallText>{copy.staticRoutesDescription}</SmallText>
            <RouteList>
              {initialData.routes.indexableStaticRoutes.map((route) => (
                <RouteRow key={route.key}>
                  <RouteLabel>{formatRouteLabel(route.key)}</RouteLabel>
                  <MetaGrid>
                    <MetaItem>
                      <MetaTerm>{copy.canonicalLabel}</MetaTerm>
                      <MetaValue>{route.canonicalUrl}</MetaValue>
                    </MetaItem>
                    <MetaItem>
                      <MetaTerm>Alternates</MetaTerm>
                      <MetaValue>{renderAlternates(copy, route.alternateLocales)}</MetaValue>
                    </MetaItem>
                  </MetaGrid>
                </RouteRow>
              ))}
            </RouteList>
          </Card>
        </Stack>

        <Stack>
          <Card>
            <CardTitle>{copy.postListTitle}</CardTitle>
            <SmallText>{copy.postListDescription}</SmallText>
            {initialData.posts.length ? (
              <PostList>
                {initialData.posts.map((post) => (
                  <PostCard key={`${post.postId}-${post.locale}`}>
                    <div>
                      <PostTitle>{post.title}</PostTitle>
                      <SmallText>{post.path}</SmallText>
                    </div>
                    <BadgeRow>
                      <Pill>{post.locale}</Pill>
                      <Pill $tone="accent">{post.twitterCard}</Pill>
                      {post.hasDedicatedOgImage ? (
                        <Pill $tone="success">{copy.heroImageLabel}: dedicated</Pill>
                      ) : null}
                      {post.isNoindex ? <Pill>Noindex</Pill> : null}
                    </BadgeRow>
                    <PostMetaGrid>
                      <MetaItem>
                        <MetaTerm>{copy.canonicalLabel}</MetaTerm>
                        <MetaValue>{post.canonicalUrl}</MetaValue>
                      </MetaItem>
                      <MetaItem>
                        <MetaTerm>Alternates</MetaTerm>
                        <MetaValue>{renderAlternates(copy, post.alternateLocales)}</MetaValue>
                      </MetaItem>
                      <MetaItem>
                        <MetaTerm>{copy.metaTitleLabel}</MetaTerm>
                        <MetaValue>{post.metaTitle}</MetaValue>
                      </MetaItem>
                      <MetaItem>
                        <MetaTerm>{copy.metaDescriptionLabel}</MetaTerm>
                        <MetaValue>
                          {post.metaDescription} ({post.metaDescriptionLength})
                        </MetaValue>
                      </MetaItem>
                      <MetaItem>
                        <MetaTerm>{copy.heroImageLabel}</MetaTerm>
                        <MetaValue>{post.imageUrl || "Not available"}</MetaValue>
                      </MetaItem>
                      <MetaItem>
                        <MetaTerm>{copy.keywordsLabel}</MetaTerm>
                        <MetaValue>{post.keywords.length ? post.keywords.join(", ") : "None"}</MetaValue>
                      </MetaItem>
                      <MetaItem>
                        <MetaTerm>{copy.schemaTypesLabel}</MetaTerm>
                        <MetaValue>{post.schemaTypes.join(", ")}</MetaValue>
                      </MetaItem>
                      <MetaItem>
                        <MetaTerm>{copy.twitterCardLabel}</MetaTerm>
                        <MetaValue>{post.twitterCard}</MetaValue>
                      </MetaItem>
                    </PostMetaGrid>
                    <BadgeRow>
                      <Pill>{post.publishedAt || "Unpublished"}</Pill>
                      <Pill $tone="accent">{post.updatedAt || "Not updated"}</Pill>
                    </BadgeRow>
                  </PostCard>
                ))}
              </PostList>
            ) : (
              <SmallText>{copy.noPosts}</SmallText>
            )}
          </Card>
        </Stack>
      </Layout>
    </Page>
  );
}
