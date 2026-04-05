"use client";

import styled from "styled-components";

const Wrapper = styled.main`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  margin: 0 auto;
  max-width: 1100px;
  padding: clamp(0.95rem, 2vw, 1.25rem);
`;

const Hero = styled.section`
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: 0 24px 80px rgba(16, 32, 51, 0.08);
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  overflow: hidden;
  padding: clamp(1rem, 2.4vw, 1.35rem);
  position: relative;

  &::after {
    background: linear-gradient(120deg, rgba(0, 95, 115, 0.15), rgba(201, 123, 42, 0.2));
    content: "";
    inset: 0;
    pointer-events: none;
    position: absolute;
  }
`;

const HeroContent = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  position: relative;
  z-index: 1;
`;

const Eyebrow = styled.p`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  margin: 0;
  text-transform: uppercase;
`;

const Title = styled.h1`
  font-size: clamp(2.2rem, 6vw, 4rem);
  line-height: 1.05;
  margin: 0;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 1rem;
  line-height: 1.58;
  margin: 0;
  max-width: 760px;
`;

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Badge = styled.span`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.text};
  display: inline-flex;
  padding: 0.45rem 0.8rem;
`;

const SectionGrid = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};

  @media (min-width: 800px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Card = styled.article`
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
`;

const CardTitle = styled.h2`
  font-size: 1.15rem;
  margin: 0;
`;

const BulletList = styled.ul`
  color: ${({ theme }) => theme.colors.muted};
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  margin: 0;
  padding-left: 1.25rem;
`;

const FooterNote = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  margin: 0;
`;

export default function PlaceholderPage({
  badges = [],
  description,
  eyebrow,
  notes = [],
  title,
}) {
  return (
    <Wrapper>
      <Hero>
        <HeroContent>
          <Eyebrow>{eyebrow}</Eyebrow>
          <Title>{title}</Title>
          <Description>{description}</Description>
          {badges.length > 0 ? (
            <BadgeRow>
              {badges.map((badge) => (
                <Badge key={badge}>{badge}</Badge>
              ))}
            </BadgeRow>
          ) : null}
        </HeroContent>
      </Hero>
      <SectionGrid>
        <Card>
          <CardTitle>Scaffold status</CardTitle>
          <BulletList>
            <li>Route file exists and renders successfully.</li>
            <li>Behavior will be added in later execution steps.</li>
            <li>This screen keeps the repo runnable while features land incrementally.</li>
          </BulletList>
        </Card>
        <Card>
          <CardTitle>Next implementation targets</CardTitle>
          <BulletList>
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </BulletList>
        </Card>
      </SectionGrid>
      <FooterNote>
        This placeholder is intentionally lightweight so later steps can add behavior without
        restructuring the route tree.
      </FooterNote>
    </Wrapper>
  );
}
