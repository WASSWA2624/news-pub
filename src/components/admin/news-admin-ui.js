import Link from "next/link";
import styled from "styled-components";

export const AdminPage = styled.main`
  display: grid;
  gap: 1.15rem;
`;

export const AdminHero = styled.section`
  background:
    radial-gradient(circle at top left, rgba(14, 106, 137, 0.18), transparent 30%),
    radial-gradient(circle at 88% 18%, rgba(244, 191, 54, 0.12), transparent 26%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 249, 255, 0.94));
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 18px;
  box-shadow: 0 18px 44px rgba(17, 31, 55, 0.06);
  display: grid;
  gap: 0.65rem;
  padding: clamp(1rem, 2.6vw, 1.6rem);
`;

export const AdminEyebrow = styled.p`
  color: rgba(14, 90, 122, 0.82);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  margin: 0;
  text-transform: uppercase;
`;

export const AdminTitle = styled.h1`
  color: #162744;
  font-size: clamp(1.85rem, 4vw, 2.8rem);
  letter-spacing: -0.045em;
  line-height: 1;
  margin: 0;
`;

export const AdminDescription = styled.p`
  color: rgba(72, 85, 108, 0.94);
  line-height: 1.65;
  margin: 0;
  max-width: 72ch;
`;

export const SummaryGrid = styled.div`
  display: grid;
  gap: 0.85rem;

  @media (min-width: 780px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

export const SummaryCard = styled.article`
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 14px;
  display: grid;
  gap: 0.2rem;
  padding: 0.9rem 1rem;
`;

export const SummaryValue = styled.strong`
  color: #132949;
  font-size: 1.25rem;
`;

export const SummaryLabel = styled.span`
  color: rgba(73, 87, 112, 0.82);
  font-size: 0.9rem;
`;

export const SectionGrid = styled.div`
  display: grid;
  gap: 1rem;

  @media (min-width: 1080px) {
    align-items: start;
    grid-template-columns: ${({ $wide }) =>
      $wide ? "minmax(0, 1.45fr) minmax(320px, 0.95fr)" : "minmax(0, 1fr) minmax(320px, 360px)"};
  }
`;

export const Card = styled.section`
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 18px;
  box-shadow: 0 16px 38px rgba(18, 34, 58, 0.05);
  display: grid;
  gap: 0.95rem;
  padding: clamp(1rem, 2vw, 1.2rem);
`;

export const CardTitle = styled.h2`
  color: #162744;
  font-size: 1.15rem;
  letter-spacing: -0.03em;
  margin: 0;
`;

export const CardDescription = styled.p`
  color: rgba(72, 85, 108, 0.92);
  line-height: 1.6;
  margin: 0;
`;

export const DataTableWrap = styled.div`
  overflow-x: auto;
`;

export const DataTable = styled.table`
  border-collapse: collapse;
  width: 100%;

  th,
  td {
    border-bottom: 1px solid rgba(16, 32, 51, 0.08);
    padding: 0.7rem 0.45rem;
    text-align: left;
    vertical-align: top;
  }

  th {
    color: rgba(60, 76, 104, 0.82);
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  td {
    color: #21344f;
    line-height: 1.55;
  }
`;

export const FieldGrid = styled.div`
  display: grid;
  gap: 0.85rem;

  @media (min-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const Field = styled.label`
  display: grid;
  gap: 0.36rem;
`;

export const FieldLabel = styled.span`
  color: #22344f;
  font-size: 0.88rem;
  font-weight: 700;
`;

const fieldStyles = `
  background: white;
  border: 1px solid rgba(16, 32, 51, 0.12);
  border-radius: 12px;
  color: #1f314b;
  min-height: 44px;
  padding: 0.72rem 0.85rem;
  width: 100%;
`;

export const Input = styled.input`
  ${fieldStyles}
`;

export const Select = styled.select`
  ${fieldStyles}
`;

export const Textarea = styled.textarea`
  ${fieldStyles}
  min-height: 132px;
  resize: vertical;
`;

export const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;

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

export const PrimaryButton = styled.button`
  align-items: center;
  background: linear-gradient(135deg, #0f6f8d 0%, #0b5871 100%);
  border: none;
  border-radius: 999px;
  color: white;
  cursor: pointer;
  display: inline-flex;
  font-weight: 800;
  justify-content: center;
  min-height: 42px;
  padding: 0.72rem 1rem;
`;

export const SecondaryButton = styled.button`
  align-items: center;
  background: rgba(16, 32, 51, 0.05);
  border: 1px solid rgba(16, 32, 51, 0.1);
  border-radius: 999px;
  color: #22344f;
  cursor: pointer;
  display: inline-flex;
  font-weight: 700;
  justify-content: center;
  min-height: 42px;
  padding: 0.72rem 1rem;
`;

export const LinkButton = styled(Link)`
  align-items: center;
  background: rgba(16, 32, 51, 0.05);
  border: 1px solid rgba(16, 32, 51, 0.1);
  border-radius: 999px;
  color: #22344f;
  display: inline-flex;
  font-weight: 700;
  justify-content: center;
  min-height: 42px;
  padding: 0.72rem 1rem;
`;

export const StatusBadge = styled.span`
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
  border-radius: 999px;
  color: ${({ $tone }) =>
    $tone === "success"
      ? "#197341"
      : $tone === "danger"
        ? "#a63725"
        : $tone === "warning"
          ? "#8f630c"
          : "#30435f"};
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 0.28rem 0.62rem;
  width: fit-content;
`;

export const EmptyState = styled.p`
  color: rgba(72, 85, 108, 0.9);
  line-height: 1.6;
  margin: 0;
`;

export const SmallText = styled.p`
  color: rgba(72, 85, 108, 0.88);
  line-height: 1.55;
  margin: 0;
`;

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
