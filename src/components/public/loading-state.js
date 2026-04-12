import styled, { keyframes } from "styled-components";

const shimmer = keyframes`
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: -100% 0;
  }
`;

const PageMain = styled.main`
  display: grid;
  gap: clamp(0.9rem, 2.1vw, 1.3rem);
  margin: 0 auto;
  max-width: var(--theme-page-max-width);
  padding: clamp(1rem, 2.3vw, 1.5rem) clamp(0.85rem, 2.2vw, 1.2rem) clamp(1.4rem, 3vw, 2.2rem);
  width: 100%;
`;

const Hero = styled.section`
  background:
    radial-gradient(circle at top left, rgba(var(--theme-story-accent-rgb), 0.1), transparent 32%),
    linear-gradient(180deg, rgba(var(--theme-surface-rgb), 0.96), rgba(var(--theme-bg-rgb), 0.94));
  border: 1px solid rgba(var(--theme-border-rgb), 0.68);
  border-radius: var(--theme-radius-md);
  display: grid;
  gap: 0.5rem;
  padding: clamp(0.8rem, 1.8vw, 1rem);
`;

const Surface = styled.section`
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(16, 32, 51, 0.08);
  box-shadow: 0 18px 42px rgba(18, 34, 58, 0.06);
  display: grid;
  gap: 0.8rem;
  padding: clamp(0.78rem, 1.9vw, 1rem);
`;

const TwoColumnGrid = styled.div`
  display: grid;
  gap: 0.8rem;

  @media (min-width: 980px) {
    align-items: start;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  }
`;

const StoryGrid = styled.div`
  display: grid;
  gap: 0.72rem;
`;

const StoryRow = styled.div`
  align-items: start;
  border-top: 1px solid rgba(16, 32, 51, 0.08);
  display: grid;
  gap: 0.72rem;
  grid-template-columns: 112px minmax(0, 1fr);
  padding-top: 0.72rem;

  &:first-child {
    border-top: none;
    padding-top: 0;
  }

  @media (max-width: 759px) {
    grid-template-columns: 88px minmax(0, 1fr);
  }
`;

const StoryBody = styled.div`
  display: grid;
  gap: 0.34rem;
  min-width: 0;
`;

const StoryLayout = styled.div`
  display: grid;
  gap: 0.9rem;

  @media (min-width: 1100px) {
    grid-template-columns: minmax(0, 2fr) minmax(280px, 0.9fr);
  }
`;

const StorySidebar = styled.div`
  display: grid;
  gap: 0.8rem;
`;

const Skeleton = styled.div`
  background:
    linear-gradient(90deg, rgba(16, 32, 51, 0.06), rgba(16, 32, 51, 0.11), rgba(16, 32, 51, 0.06));
  background-size: 200% 100%;
  animation: ${shimmer} 1.6s ease-in-out infinite;
  border-radius: ${({ $pill }) => ($pill ? "999px" : "0")};
  height: ${({ $height = "1rem" }) => $height};
  width: ${({ $width = "100%" }) => $width};
`;

function SkeletonStoryRows({ count = 4 }) {
  return (
    <StoryGrid aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <StoryRow key={`story-row-${index}`}>
          <Skeleton $height="84px" $width="100%" />
          <StoryBody>
            <Skeleton $height="1.65rem" $width="42%" $pill />
            <Skeleton $height="1.2rem" $width="92%" />
            <Skeleton $height="0.9rem" $width="58%" />
            <Skeleton $height="0.86rem" $width="100%" />
            <Skeleton $height="0.86rem" $width="76%" />
          </StoryBody>
        </StoryRow>
      ))}
    </StoryGrid>
  );
}

export function PublicHomeLoadingState() {
  return (
    <PageMain aria-busy="true" aria-live="polite">
      <Hero>
        <Skeleton $height="0.72rem" $width="22%" />
        <Skeleton $height="2rem" $width="56%" />
        <Skeleton $height="0.95rem" $width="78%" />
        <Skeleton $height="110px" $width="100%" />
      </Hero>

      <TwoColumnGrid>
        <div style={{ display: "grid", gap: "1rem" }}>
          <Surface>
            <Skeleton $height="1.3rem" $width="34%" />
            <Skeleton $height="260px" $width="100%" />
            <Skeleton $height="1rem" $width="88%" />
            <Skeleton $height="0.9rem" $width="72%" />
          </Surface>

          <Surface>
            <Skeleton $height="1.3rem" $width="30%" />
            <SkeletonStoryRows count={5} />
          </Surface>
        </div>

        <div style={{ display: "grid", gap: "0.8rem" }}>
          <Surface>
            <Skeleton $height="1.2rem" $width="46%" />
            <Skeleton $height="0.9rem" $width="86%" />
            <SkeletonStoryRows count={3} />
          </Surface>
          <Surface>
            <Skeleton $height="1.2rem" $width="40%" />
            <Skeleton $height="200px" $width="100%" />
          </Surface>
        </div>
      </TwoColumnGrid>
    </PageMain>
  );
}

export function PublicCollectionLoadingState({ showSearch = false } = {}) {
  return (
    <PageMain aria-busy="true" aria-live="polite">
      <Hero>
        <Skeleton $height="0.72rem" $width="18%" />
        <Skeleton $height="1.8rem" $width="52%" />
        <Skeleton $height="0.95rem" $width="82%" />
      </Hero>

      <Surface>
        {showSearch ? (
          <div style={{ display: "grid", gap: "0.8rem" }}>
            <Skeleton $height="120px" $width="100%" />
            <Skeleton $height="124px" $width="100%" />
          </div>
        ) : null}
        <SkeletonStoryRows count={5} />
      </Surface>
    </PageMain>
  );
}

export function PublicStoryLoadingState() {
  return (
    <PageMain aria-busy="true" aria-live="polite">
      <Hero>
        <Skeleton $height="0.82rem" $width="30%" />
        <Skeleton $height="2.2rem" $width="72%" />
        <Skeleton $height="1rem" $width="88%" />
        <Skeleton $height="420px" $width="100%" />
      </Hero>

      <StoryLayout>
        <div style={{ display: "grid", gap: "0.9rem" }}>
          <Surface>
            <Skeleton $height="0.85rem" $width="24%" />
            <Skeleton $height="1rem" $width="42%" />
            <Skeleton $height="1rem" $width="100%" />
            <Skeleton $height="1rem" $width="100%" />
            <Skeleton $height="1rem" $width="94%" />
            <Skeleton $height="1rem" $width="88%" />
            <Skeleton $height="1rem" $width="76%" />
          </Surface>

          <Surface>
            <Skeleton $height="1.2rem" $width="36%" />
            <SkeletonStoryRows count={3} />
          </Surface>
        </div>

        <StorySidebar>
          <Surface>
            <Skeleton $height="1.1rem" $width="54%" />
            <Skeleton $height="0.95rem" $width="100%" />
            <Skeleton $height="0.95rem" $width="84%" />
          </Surface>
          <Surface>
            <Skeleton $height="1.1rem" $width="42%" />
            <Skeleton $height="2.1rem" $width="100%" $pill />
            <Skeleton $height="2.1rem" $width="100%" $pill />
          </Surface>
        </StorySidebar>
      </StoryLayout>
    </PageMain>
  );
}
