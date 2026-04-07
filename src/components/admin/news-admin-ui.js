import Link from "next/link";
import styled from "styled-components";

import AppIcon from "@/components/common/app-icon";

export const AdminPage = styled.main`
  display: grid;
  gap: 0.6rem;
  margin: 0 auto;
  max-width: 1380px;
  padding: clamp(0.5rem, 1.6vw, 0.9rem);
  width: 100%;
`;

export const AdminHero = styled.section`
  background:
    radial-gradient(circle at top left, rgba(15, 111, 141, 0.16), transparent 34%),
    radial-gradient(circle at 86% 18%, rgba(224, 165, 58, 0.12), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(246, 249, 253, 0.96));
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 0;
  box-shadow: 0 14px 32px rgba(17, 31, 55, 0.05);
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

export const AdminIconBadge = styled.span`
  align-items: center;
  background:
    ${({ $tone }) =>
      $tone === "accent"
        ? "linear-gradient(180deg, rgba(224, 165, 58, 0.18), rgba(224, 165, 58, 0.1))"
        : $tone === "danger"
          ? "linear-gradient(180deg, rgba(176, 46, 34, 0.14), rgba(176, 46, 34, 0.08))"
          : $tone === "success"
            ? "linear-gradient(180deg, rgba(27, 138, 73, 0.14), rgba(27, 138, 73, 0.08))"
            : $tone === "muted"
              ? "rgba(16, 32, 51, 0.06)"
              : "linear-gradient(180deg, rgba(15, 111, 141, 0.16), rgba(15, 111, 141, 0.08))"};
  border: 1px solid
    ${({ $tone }) =>
      $tone === "accent"
        ? "rgba(168, 113, 12, 0.16)"
        : $tone === "danger"
          ? "rgba(176, 46, 34, 0.16)"
          : $tone === "success"
            ? "rgba(27, 138, 73, 0.16)"
            : $tone === "muted"
              ? "rgba(16, 32, 51, 0.08)"
              : "rgba(15, 111, 141, 0.18)"};
  border-radius: var(--theme-radius-md, 1px);
  color: ${({ $tone }) =>
    $tone === "accent"
      ? "#8f630c"
      : $tone === "danger"
        ? "#a63725"
        : $tone === "success"
          ? "#197341"
          : $tone === "muted"
            ? "#30435f"
            : "#0d5f79"};
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
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 255, 0.95)),
    radial-gradient(circle at top right, rgba(36, 75, 115, 0.06), transparent 46%);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 0;
  box-shadow: 0 10px 22px rgba(18, 34, 58, 0.04);
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

export const Card = styled.section`
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 0;
  box-shadow: 0 12px 26px rgba(18, 34, 58, 0.045);
  display: grid;
  gap: 0.55rem;
  min-width: 0;
  padding: clamp(0.62rem, 1.7vw, 0.82rem);
`;

export const CardHeader = styled.div`
  display: grid;
  gap: 0.18rem;
`;

export const CardTitle = styled.h2`
  color: #162744;
  font-size: 0.96rem;
  letter-spacing: -0.03em;
  margin: 0;
`;

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

export const RecordStack = styled.div`
  display: grid;
  gap: 0.5rem;
`;

export const RecordCard = styled.article`
  background:
    linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(255, 255, 255, 0.95)),
    radial-gradient(circle at top right, rgba(36, 75, 115, 0.05), transparent 44%);
  border: 1px solid rgba(16, 32, 51, 0.08);
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

export const MetaPill = styled.span`
  align-items: center;
  background: rgba(36, 75, 115, 0.08);
  border: 1px solid rgba(36, 75, 115, 0.12);
  border-radius: 0;
  color: #244b73;
  display: inline-flex;
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  min-height: 22px;
  padding: 0 0.46rem;
  text-transform: uppercase;
`;

export const FormSection = styled.div`
  display: grid;
  gap: 0.45rem;
  padding-top: 0.5rem;

  &:not(:first-child) {
    border-top: 1px solid rgba(16, 32, 51, 0.08);
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
    border-bottom: 1px solid rgba(16, 32, 51, 0.08);
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
      background:
        linear-gradient(180deg, rgba(247, 250, 255, 0.98), rgba(255, 255, 255, 0.96)),
        radial-gradient(circle at top right, rgba(36, 75, 115, 0.05), transparent 48%);
      border: 1px solid rgba(16, 32, 51, 0.08);
      border-radius: 0;
      box-shadow: 0 12px 24px rgba(16, 32, 51, 0.04);
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
  gap: 0.22rem;
  min-width: 0;
`;

export const FieldLabel = styled.span`
  color: #22344f;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.01em;
`;

const fieldStyles = `
  background: white;
  border: 1px solid rgba(16, 32, 51, 0.12);
  border-radius: 0;
  color: #1f314b;
  font-size: 0.88rem;
  min-height: 34px;
  padding: 0.48rem 0.62rem;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;
  width: 100%;

  &:focus {
    border-color: rgba(27, 79, 147, 0.42);
    box-shadow: 0 0 0 4px rgba(27, 79, 147, 0.08);
    outline: none;
  }

  &[aria-invalid="true"] {
    border-color: rgba(176, 46, 34, 0.42);
    box-shadow: 0 0 0 4px rgba(176, 46, 34, 0.08);
    outline: none;
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
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 0;
  color: #22344f;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.76rem;
  font-weight: 600;
  gap: 0.28rem;
  min-height: 28px;
  padding: 0 0.52rem;

  input {
    accent-color: var(--theme-primary);
    margin: 0;
  }
`;

export const ButtonRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.32rem;

  > form {
    display: inline-flex;
  }

  @media (max-width: 560px) {
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

const buttonStyles = `
  align-items: center;
  border-radius: 0;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.8rem;
  font-weight: 800;
  gap: 0.32rem;
  justify-content: center;
  min-height: 31px;
  padding: 0.44rem 0.68rem;
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
    outline: none;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
`;

export const PrimaryButton = styled.button`
  ${buttonStyles}
  background: linear-gradient(135deg, #0f6f8d 0%, #0d5f79 100%);
  border: 1px solid transparent;
  box-shadow: 0 12px 24px rgba(15, 96, 121, 0.18);
  color: white;

  &:focus-visible {
    box-shadow:
      0 12px 24px rgba(15, 96, 121, 0.2),
      0 0 0 4px rgba(15, 111, 141, 0.12);
  }
`;

export const SecondaryButton = styled.button`
  ${buttonStyles}
  background: rgba(16, 32, 51, 0.05);
  border: 1px solid rgba(16, 32, 51, 0.1);
  color: #22344f;

  &:focus-visible {
    box-shadow: 0 0 0 4px rgba(27, 79, 147, 0.08);
  }
`;

export const DangerButton = styled.button`
  ${buttonStyles}
  background: rgba(180, 35, 24, 0.08);
  border: 1px solid rgba(180, 35, 24, 0.14);
  color: #a63725;

  &:focus-visible {
    box-shadow: 0 0 0 4px rgba(180, 35, 24, 0.08);
  }
`;

export const LinkButton = styled(Link)`
  ${buttonStyles}
  background: rgba(16, 32, 51, 0.05);
  border: 1px solid rgba(16, 32, 51, 0.1);
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
  min-height: 22px;
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

export function ActionIcon({ name }) {
  return <AppIcon name={name} size={18} />;
}

export function formatDateTime(value) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatEnumLabel(value) {
  return `${value || ""}`
    .trim()
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
