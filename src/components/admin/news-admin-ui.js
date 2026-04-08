/**
 * Shared NewsPub admin design primitives for route surfaces, cards, action
 * rows, tables, and compact record layouts.
 */

import Link from "next/link";
import styled, { css } from "styled-components";

import { adminUiLayoutContract } from "@/components/admin/admin-ui-contract";
import AppIcon from "@/components/common/app-icon";
import { controlSurfaceCss, elevatedSurfaceCss, focusRingCss } from "@/components/common/ui-surface";

/** Shared outer page frame for every admin route. */
export const AdminPage = styled.main`
  display: grid;
  gap: 0.6rem;
  margin: 0 auto;
  max-width: 1380px;
  padding: clamp(0.5rem, 1.6vw, 0.9rem);
  width: 100%;
`;

export const AdminHero = styled.section`
  ${elevatedSurfaceCss}
  background:
    radial-gradient(circle at top left, rgba(var(--theme-accent-rgb), 0.09), transparent 34%),
    radial-gradient(circle at 86% 18%, rgba(var(--theme-primary-rgb), 0.06), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.995), rgba(var(--theme-surface-alt-rgb), 0.97));
  border: 1px solid rgba(var(--theme-text-rgb), 0.14);
  border-radius: 0;
  display: grid;
  gap: 0.28rem;
  padding: clamp(0.62rem, 1.8vw, 0.88rem);
`;

export const AdminEyebrow = styled.p`
  color: rgba(14, 90, 122, 0.8);
  font-size: 0.67rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  margin: 0;
  text-transform: uppercase;
`;

export const AdminTitle = styled.h1`
  color: #162744;
  font-size: clamp(1.2rem, 4vw, 1.95rem);
  letter-spacing: -0.04em;
  line-height: 1;
  margin: 0;
`;

export const AdminDescription = styled.p`
  color: rgba(72, 85, 108, 0.94);
  font-size: 0.86rem;
  line-height: 1.5;
  margin: 0;
  max-width: 62ch;
`;

function getAdminIconBadgeColors(tone) {
  if (tone === "accent") {
    return {
      background: "linear-gradient(180deg, rgba(224, 165, 58, 0.18), rgba(224, 165, 58, 0.1))",
      border: "rgba(168, 113, 12, 0.16)",
      color: "#8f630c",
    };
  }

  if (tone === "facebook") {
    return {
      background: "linear-gradient(180deg, rgba(24, 119, 242, 0.16), rgba(24, 119, 242, 0.08))",
      border: "rgba(24, 119, 242, 0.18)",
      color: "#1666d3",
    };
  }

  if (tone === "instagram") {
    return {
      background: "linear-gradient(180deg, rgba(225, 48, 108, 0.16), rgba(225, 48, 108, 0.08))",
      border: "rgba(225, 48, 108, 0.18)",
      color: "#b42357",
    };
  }

  if (tone === "website") {
    return {
      background: "linear-gradient(180deg, rgba(15, 111, 141, 0.16), rgba(15, 111, 141, 0.08))",
      border: "rgba(15, 111, 141, 0.18)",
      color: "#0d5f79",
    };
  }

  if (tone === "danger") {
    return {
      background: "linear-gradient(180deg, rgba(176, 46, 34, 0.14), rgba(176, 46, 34, 0.08))",
      border: "rgba(176, 46, 34, 0.16)",
      color: "#a63725",
    };
  }

  if (tone === "success") {
    return {
      background: "linear-gradient(180deg, rgba(27, 138, 73, 0.14), rgba(27, 138, 73, 0.08))",
      border: "rgba(27, 138, 73, 0.16)",
      color: "#197341",
    };
  }

  if (tone === "muted") {
    return {
      background: "rgba(16, 32, 51, 0.06)",
      border: "rgba(16, 32, 51, 0.08)",
      color: "#30435f",
    };
  }

  return {
    background: "linear-gradient(180deg, rgba(15, 111, 141, 0.16), rgba(15, 111, 141, 0.08))",
    border: "rgba(15, 111, 141, 0.18)",
    color: "#0d5f79",
  };
}

/**
 * Compact icon badge used across admin cards, records, and scoped picker rows.
 *
 * Supported tones intentionally cover both semantic states and the recurring
 * destination platforms so route code does not have to recreate the same badge
 * styling locally.
 */
export const AdminIconBadge = styled.span`
  align-items: center;
  background: ${({ $tone }) => getAdminIconBadgeColors($tone).background};
  border: 1px solid ${({ $tone }) => getAdminIconBadgeColors($tone).border};
  border-radius: var(--theme-radius-md, 1px);
  color: ${({ $tone }) => getAdminIconBadgeColors($tone).color};
  display: inline-flex;
  flex: 0 0 auto;
  height: ${({ $size }) => $size || "2.4rem"};
  justify-content: center;
  width: ${({ $size }) => $size || "2.4rem"};

  svg {
    height: ${({ $iconSize }) => $iconSize || "1.1rem"};
    width: ${({ $iconSize }) => $iconSize || "1.1rem"};
  }
`;

const AdminHeroHeadingRow = styled.div`
  align-items: start;
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
`;

const AdminHeroCopy = styled.div`
  display: grid;
  gap: 0.28rem;
  min-width: 0;
`;

const SummaryHeader = styled.div`
  align-items: center;
  display: flex;
  gap: 0.48rem;
  min-width: 0;
`;

const SectionTitleRow = styled.span`
  align-items: center;
  display: inline-flex;
  gap: 0.45rem;
  min-width: 0;
`;

/**
 * Renders the Admin Hero Heading in the NewsPub admin workspace.
 */
export function AdminHeroHeading({ description, icon, title, tone = "primary" }) {
  return (
    <AdminHeroHeadingRow>
      {icon ? (
        <AdminIconBadge $iconSize="1.22rem" $size="2.7rem" $tone={tone}>
          <AppIcon name={icon} size={22} />
        </AdminIconBadge>
      ) : null}
      <AdminHeroCopy>
        <AdminTitle>{title}</AdminTitle>
        {description ? <AdminDescription>{description}</AdminDescription> : null}
      </AdminHeroCopy>
    </AdminHeroHeadingRow>
  );
}

/**
 * Renders the Admin Metric Card in the NewsPub admin workspace.
 */
export function AdminMetricCard({ icon, label, tone = "primary", value }) {
  return (
    <SummaryCard>
      <SummaryHeader>
        {icon ? (
          <AdminIconBadge $iconSize="0.95rem" $size="2rem" $tone={tone}>
            <AppIcon name={icon} size={16} />
          </AdminIconBadge>
        ) : null}
        <SummaryLabel>{label}</SummaryLabel>
      </SummaryHeader>
      <SummaryValue>{value}</SummaryValue>
    </SummaryCard>
  );
}

export const SummaryGrid = styled.div`
  display: grid;
  gap: 0.45rem;

  @media (min-width: 560px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 980px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

export const SummaryCard = styled.article`
  ${elevatedSurfaceCss}
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.99),
    rgba(var(--theme-surface-alt-rgb), 0.97)
  );
  border: 1px solid rgba(var(--theme-text-rgb), 0.14);
  border-radius: 0;
  display: grid;
  gap: 0.12rem;
  padding: 0.58rem 0.66rem;
`;

export const SummaryValue = styled.strong`
  color: #132949;
  font-size: clamp(0.96rem, 3vw, 1.18rem);
  letter-spacing: -0.03em;
`;

export const SummaryLabel = styled.span`
  color: rgba(73, 87, 112, 0.82);
  font-size: 0.77rem;
  line-height: 1.35;
`;

/** Responsive two-column layout used by admin workspaces with side panels. */
export const SectionGrid = styled.div`
  align-items: start;
  display: grid;
  gap: 0.6rem;

  @media (min-width: 1080px) {
    grid-template-columns: ${({ $wide }) =>
      $wide ? "minmax(0, 1.35fr) minmax(300px, 0.9fr)" : "minmax(0, 1fr) minmax(280px, 360px)"};
  }
`;

export const SidebarStack = styled.div`
  display: grid;
  gap: 0.6rem;
`;

/** Base elevated card surface for admin panels and inset work areas. */
export const Card = styled.section`
  ${elevatedSurfaceCss}
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.99),
    rgba(var(--theme-surface-alt-rgb), 0.975)
  );
  border: 1px solid rgba(var(--theme-text-rgb), 0.14);
  border-radius: 0;
  display: grid;
  gap: 0.55rem;
  min-width: 0;
  padding: clamp(0.62rem, 1.7vw, 0.82rem);
`;

/** Default stacked card header used by route cards and sticky panels. */
export const CardHeader = styled.div`
  display: grid;
  gap: 0.18rem;
`;

/** Shared split header that keeps copy and trailing actions aligned responsively. */
export const CardToolbar = styled.div`
  align-items: start;
  display: grid;
  gap: 0.75rem;

  @media (min-width: 860px) {
    grid-template-columns: minmax(0, 1fr) auto;
  }
`;

export const CardTitle = styled.h2`
  color: #162744;
  font-size: 0.96rem;
  letter-spacing: -0.03em;
  margin: 0;
`;

/**
 * Renders the Admin Section Title in the NewsPub admin workspace.
 */
export function AdminSectionTitle({ children, icon, tone = "accent" }) {
  return (
    <CardTitle>
      <SectionTitleRow>
        {icon ? (
          <AdminIconBadge $iconSize="0.9rem" $size="1.9rem" $tone={tone}>
            <AppIcon name={icon} size={15} />
          </AdminIconBadge>
        ) : null}
        <span>{children}</span>
      </SectionTitleRow>
    </CardTitle>
  );
}

export const CardDescription = styled.p`
  color: rgba(72, 85, 108, 0.92);
  font-size: 0.82rem;
  line-height: 1.45;
  margin: 0;
`;

/**
 * Sticky secondary panel shell used by admin create/composer sidebars.
 *
 * The desktop constraint keeps long side panels usable without pushing action
 * controls off-screen on shorter viewports.
 */
export const StickySideCard = styled(Card)`
  align-self: start;
  overflow: hidden;

  @media (min-width: ${adminUiLayoutContract.workspaceTwoColumnBreakpoint}px) {
    grid-template-rows: auto minmax(0, 1fr);
    max-height: calc(100dvh - var(--admin-sticky-top, ${adminUiLayoutContract.stickySidebarTop}) - 0.5rem);
    position: sticky;
    top: var(--admin-sticky-top, ${adminUiLayoutContract.stickySidebarTop});
  }
`;

/** Sticky panel header variant that preserves the shared card rhythm on scroll. */
export const StickySideCardHeader = styled(CardHeader)`
  @media (min-width: ${adminUiLayoutContract.workspaceTwoColumnBreakpoint}px) {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 252, 255, 0.94)),
      radial-gradient(circle at top right, rgba(15, 111, 141, 0.06), transparent 52%);
    border-bottom: 1px solid rgba(var(--theme-text-rgb), 0.14);
    margin: calc(clamp(0.62rem, 1.7vw, 0.82rem) * -1) calc(clamp(0.62rem, 1.7vw, 0.82rem) * -1) 0;
    padding: clamp(0.62rem, 1.7vw, 0.82rem);
  }
`;

/** Shared content wrapper for sticky side panels. */
export const StickySideCardBody = styled.div`
  display: grid;
  gap: 0.55rem;
  min-width: 0;
`;

/** Shared scroll area for tall sticky side panels on desktop. */
export const StickySideCardScrollArea = styled(StickySideCardBody)`
  min-height: 0;

  @media (min-width: ${adminUiLayoutContract.workspaceTwoColumnBreakpoint}px) {
    margin-right: -0.2rem;
    overflow-y: auto;
    padding-right: 0.4rem;
    scrollbar-color: rgba(36, 75, 115, 0.26) transparent;
    scrollbar-width: thin;
  }

  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(36, 75, 115, 0.26);
    border: 3px solid transparent;
    border-radius: var(--theme-radius-lg, 2px);
    background-clip: padding-box;
  }
`;

export const RecordStack = styled.div`
  display: grid;
  gap: 0.5rem;
`;

export const RecordCard = styled.article`
  ${elevatedSurfaceCss}
  background: linear-gradient(
    180deg,
    rgba(var(--theme-surface-alt-rgb), 0.99),
    rgba(255, 255, 255, 0.97)
  );
  border: 1px solid rgba(var(--theme-text-rgb), 0.14);
  border-radius: 0;
  display: grid;
  gap: 0.5rem;
  padding: 0.62rem;
`;

export const RecordHeader = styled.div`
  display: grid;
  gap: 0.32rem;

  @media (min-width: 720px) {
    align-items: start;
    grid-template-columns: minmax(0, 1fr) auto;
  }
`;

export const RecordTitleBlock = styled.div`
  display: grid;
  gap: 0.14rem;
  min-width: 0;
`;

export const RecordTitle = styled.h3`
  color: #172844;
  font-size: 0.9rem;
  letter-spacing: -0.02em;
  margin: 0;
`;

export const RecordMeta = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.28rem;
`;

/** Shared wrapping rail for compact chips, pills, and tag-like metadata. */
export const PillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  min-width: 0;
`;

/** Shared compact pill for metadata, scope counts, and directory chips. */
export const MetaPill = styled.span`
  align-items: center;
  background: ${({ $tone }) =>
    $tone === "accent"
      ? "rgba(15, 111, 141, 0.08)"
      : $tone === "facebook"
        ? "rgba(24, 119, 242, 0.1)"
        : $tone === "instagram"
          ? "rgba(225, 48, 108, 0.1)"
          : $tone === "success"
            ? "rgba(27, 138, 73, 0.1)"
            : $tone === "warning"
              ? "rgba(168, 113, 12, 0.12)"
              : $tone === "danger"
                ? "rgba(176, 46, 34, 0.1)"
                : "rgba(36, 75, 115, 0.08)"};
  border: 1px solid ${({ $tone }) =>
    $tone === "accent"
      ? "rgba(15, 111, 141, 0.14)"
      : $tone === "facebook"
        ? "rgba(24, 119, 242, 0.18)"
        : $tone === "instagram"
          ? "rgba(225, 48, 108, 0.18)"
          : $tone === "success"
            ? "rgba(27, 138, 73, 0.16)"
            : $tone === "warning"
              ? "rgba(168, 113, 12, 0.2)"
              : $tone === "danger"
                ? "rgba(176, 46, 34, 0.18)"
                : "rgba(36, 75, 115, 0.12)"};
  border-radius: 0;
  color: ${({ $tone }) =>
    $tone === "accent"
      ? "#0d5f79"
      : $tone === "facebook"
        ? "#1666d3"
        : $tone === "instagram"
          ? "#b42357"
          : $tone === "success"
            ? "#197341"
            : $tone === "warning"
              ? "#8f630c"
              : $tone === "danger"
                ? "#a63725"
                : "#244b73"};
  display: inline-flex;
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  min-height: var(--admin-compact-pill-min-height);
  padding: 0 0.46rem;
  text-transform: uppercase;
`;

export const FormSection = styled.div`
  display: grid;
  gap: 0.55rem;
  padding-top: 0.58rem;

  &:not(:first-child) {
    border-top: 1px solid rgba(var(--theme-text-rgb), 0.12);
  }
`;

export const FormSectionTitle = styled.h4`
  color: #21344f;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  margin: 0;
  text-transform: uppercase;
`;

export const DataTableWrap = styled.div`
  min-width: 0;
  overflow-x: auto;

  @media (max-width: 719px) {
    overflow: visible;
  }
`;

export const DataTable = styled.table`
  border-collapse: collapse;
  width: 100%;

  th,
  td {
    border-bottom: 1px solid rgba(var(--theme-text-rgb), 0.12);
    padding: 0.46rem 0.34rem;
    text-align: left;
    vertical-align: top;
  }

  th {
    color: rgba(60, 76, 104, 0.82);
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  td {
    color: #21344f;
    font-size: 0.84rem;
    line-height: 1.45;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  @media (max-width: 719px) {
    display: block;

    thead {
      border: 0;
      clip: rect(0 0 0 0);
      height: 1px;
      margin: -1px;
      overflow: hidden;
      padding: 0;
      position: absolute;
      width: 1px;
    }

    tbody {
      display: grid;
      gap: 0.5rem;
    }

    tr {
      ${elevatedSurfaceCss}
      background: linear-gradient(
        180deg,
        rgba(var(--theme-surface-alt-rgb), 0.99),
        rgba(255, 255, 255, 0.97)
      );
      border: 1px solid rgba(var(--theme-text-rgb), 0.14);
      border-radius: 0;
      display: grid;
      gap: 0.34rem;
      padding: 0.62rem;
    }

    th,
    td {
      border: none;
      display: grid;
      gap: 0.14rem;
      padding: 0;
    }

    td::before {
      color: rgba(69, 83, 108, 0.86);
      content: attr(data-label);
      font-size: 0.66rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
  }
`;

export const FieldGrid = styled.div`
  display: grid;
  gap: 0.45rem;

  @media (min-width: 700px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 1240px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

export const Field = styled.label`
  display: grid;
  gap: 0.3rem;
  min-width: 0;
`;

export const FieldLabel = styled.span`
  color: #22344f;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.01em;
`;

export const FieldHint = styled.p`
  color: rgba(72, 85, 108, 0.88);
  font-size: 0.76rem;
  line-height: 1.45;
  margin: 0;
`;

export const FieldErrorText = styled.p`
  color: #a63725;
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1.45;
  margin: 0;
`;

const fieldStyles = css`
  ${controlSurfaceCss}
  ${focusRingCss}
  border: 1px solid rgba(var(--theme-text-rgb), 0.48);
  border-radius: 0;
  color: #1f314b;
  font-size: 0.88rem;
  min-height: var(--admin-control-min-height);
  padding: var(--admin-control-padding-block) var(--admin-control-padding-inline);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;
  width: 100%;

  &:focus {
    outline: none;
  }

  &:hover {
    border-color: rgba(var(--theme-text-rgb), 0.62);
  }

  &[aria-invalid="true"] {
    border-color: rgba(var(--theme-danger-rgb), 0.7);
    box-shadow:
      var(--theme-shadow-sm),
      0 0 0 4px rgba(var(--theme-danger-rgb), 0.12);
  }

  &[aria-invalid="true"]:focus-visible {
    box-shadow:
      var(--theme-shadow-sm),
      0 0 0 4px rgba(var(--theme-danger-rgb), 0.18);
    outline-color: rgba(var(--theme-danger-rgb), 0.85);
  }

  @media (forced-colors: active) {
    &[aria-invalid="true"] {
      border-color: CanvasText;
      box-shadow: none;
    }
  }
`;

export const Input = styled.input`
  ${fieldStyles}
`;

export const Select = styled.select`
  ${fieldStyles}
`;

export const Textarea = styled.textarea`
  ${fieldStyles}
  min-height: 96px;
  resize: vertical;
`;

export const CheckboxRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.32rem;
`;

export const CheckboxChip = styled.label`
  align-items: center;
  background: rgba(16, 32, 51, 0.04);
  border: 1px solid rgba(var(--theme-text-rgb), 0.16);
  border-radius: 0;
  color: #22344f;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.76rem;
  font-weight: 600;
  gap: 0.28rem;
  min-height: calc(var(--admin-control-min-height) - 8px);
  padding: 0 0.52rem;

  input {
    accent-color: var(--theme-primary);
    margin: 0;
  }
`;

/** Shared action row that keeps buttons/forms wrapping cleanly at narrow widths. */
export const ButtonRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.32rem;
  justify-content: ${({ $justify }) => $justify || "flex-start"};

  > form {
    display: inline-flex;
  }

  @media (max-width: ${adminUiLayoutContract.buttonRowCollapseMaxWidth}px) {
    > button,
    > a,
    > form {
      width: 100%;
    }

    > form > button {
      width: 100%;
    }
  }
`;

export const ButtonIcon = styled.span`
  align-items: center;
  display: inline-flex;
  flex: 0 0 auto;
  justify-content: center;

  svg {
    display: block;
    height: 0.95rem;
    width: 0.95rem;
  }
`;

const buttonStyles = css`
  align-items: center;
  border-radius: 0;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.8rem;
  font-weight: 800;
  gap: var(--admin-control-gap);
  justify-content: center;
  min-height: var(--admin-button-min-height);
  padding: var(--admin-control-padding-block) var(--admin-control-padding-inline);
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    color 160ms ease,
    transform 160ms ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid rgba(var(--theme-primary-rgb), 0.85);
    outline-offset: 2px;
  }

  @media (forced-colors: active) {
    &:focus-visible {
      box-shadow: none !important;
      outline: 2px solid CanvasText;
    }
  }

  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
`;

export const PrimaryButton = styled.button`
  ${buttonStyles}
  ${controlSurfaceCss}
  background: linear-gradient(
    135deg,
    rgba(var(--theme-primary-rgb), 0.98) 0%,
    rgba(var(--theme-info-rgb), 0.96) 100%
  );
  border: 1px solid transparent;
  color: white;

  &:focus-visible {
    box-shadow:
      var(--theme-shadow-md),
      0 0 0 4px rgba(15, 111, 141, 0.12);
  }
`;

export const SecondaryButton = styled.button`
  ${buttonStyles}
  ${controlSurfaceCss}
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.995),
    rgba(var(--theme-surface-alt-rgb), 0.975)
  );
  border: 1px solid rgba(var(--theme-text-rgb), 0.16);
  color: #22344f;

  &:focus-visible {
    box-shadow: 0 0 0 4px rgba(27, 79, 147, 0.08);
  }
`;

export const DangerButton = styled.button`
  ${buttonStyles}
  ${controlSurfaceCss}
  background: linear-gradient(
    180deg,
    rgba(var(--theme-danger-rgb), 0.1),
    rgba(255, 255, 255, 0.98)
  );
  border: 1px solid rgba(var(--theme-danger-rgb), 0.16);
  color: #a63725;

  &:focus-visible {
    box-shadow: 0 0 0 4px rgba(var(--theme-danger-rgb), 0.08);
  }
`;

export const LinkButton = styled(Link)`
  ${buttonStyles}
  ${controlSurfaceCss}
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.995),
    rgba(var(--theme-surface-alt-rgb), 0.975)
  );
  border: 1px solid rgba(var(--theme-text-rgb), 0.16);
  color: #22344f;
`;

export const StatusBadge = styled.span`
  align-items: center;
  background: ${({ $tone }) =>
    $tone === "success"
      ? "rgba(27, 138, 73, 0.1)"
      : $tone === "danger"
        ? "rgba(176, 46, 34, 0.1)"
        : $tone === "warning"
          ? "rgba(168, 113, 12, 0.12)"
          : "rgba(16, 32, 51, 0.06)"};
  border: 1px solid
    ${({ $tone }) =>
      $tone === "success"
        ? "rgba(27, 138, 73, 0.16)"
        : $tone === "danger"
          ? "rgba(176, 46, 34, 0.18)"
          : $tone === "warning"
            ? "rgba(168, 113, 12, 0.2)"
            : "rgba(16, 32, 51, 0.08)"};
  border-radius: 0;
  color: ${({ $tone }) =>
    $tone === "success"
      ? "#197341"
      : $tone === "danger"
        ? "#a63725"
        : $tone === "warning"
          ? "#8f630c"
          : "#30435f"};
  display: inline-flex;
  font-size: 0.63rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  min-height: var(--admin-compact-pill-min-height);
  padding: 0 0.44rem;
  text-transform: uppercase;
  width: fit-content;
`;

export const NoticeBanner = styled.div`
  background: ${({ $tone }) =>
    $tone === "success"
      ? "rgba(27, 138, 73, 0.08)"
      : $tone === "warning"
        ? "rgba(168, 113, 12, 0.1)"
        : "rgba(176, 46, 34, 0.08)"};
  border: 1px solid
    ${({ $tone }) =>
      $tone === "success"
        ? "rgba(27, 138, 73, 0.18)"
        : $tone === "warning"
          ? "rgba(168, 113, 12, 0.18)"
          : "rgba(176, 46, 34, 0.18)"};
  border-radius: 0;
  color: ${({ $tone }) =>
    $tone === "success"
      ? "#197341"
      : $tone === "warning"
        ? "#8f630c"
        : "#a63725"};
  display: grid;
  gap: 0.22rem;
  padding: 0.56rem 0.66rem;
`;

export const NoticeTitle = styled.strong`
  color: inherit;
  font-size: 0.8rem;
  letter-spacing: -0.01em;
`;

export const NoticeList = styled.ul`
  display: grid;
  gap: 0.2rem;
  margin: 0;
  padding-left: 0.9rem;
`;

export const NoticeItem = styled.li`
  font-size: 0.82rem;
  line-height: 1.4;
`;

export const EmptyState = styled.p`
  color: rgba(72, 85, 108, 0.9);
  font-size: 0.84rem;
  line-height: 1.45;
  margin: 0;
`;

export const SmallText = styled.p`
  color: rgba(72, 85, 108, 0.88);
  font-size: 0.78rem;
  line-height: 1.4;
  margin: 0;
`;

/** Shared inline metadata line with icon-safe spacing and wrapping. */
export const InlineMetaText = styled(SmallText)`
  align-items: center;
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.38rem;

  svg {
    flex: 0 0 auto;
    height: 0.82rem;
    width: 0.82rem;
  }
`;

/**
 * Renders the Action Icon in the NewsPub admin workspace.
 */
export function ActionIcon({ name }) {
  return <AppIcon name={name} size={18} />;
}

/**
 * Formats format Date Time in the NewsPub admin workspace.
 */
export function formatDateTime(value) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * Formats format Enum Label in the NewsPub admin workspace.
 */
export function formatEnumLabel(value) {
  return `${value || ""}`
    .trim()
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
