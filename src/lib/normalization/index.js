function trimToUndefined(value) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed : undefined;
}

function collapseWhitespace(value) {
  const trimmed = trimToUndefined(value);

  return trimmed ? trimmed.replace(/\s+/g, " ") : "";
}

function stripAccents(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeEquipmentName(value) {
  const collapsed = collapseWhitespace(value);

  if (!collapsed) {
    return "";
  }

  return stripAccents(collapsed)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function createSlug(value, fallback = "item") {
  const normalized = normalizeEquipmentName(value);

  return normalized ? normalized.replace(/\s+/g, "-") : fallback;
}

export function normalizeDisplayText(value) {
  return collapseWhitespace(value);
}

export function createCanonicalEquipmentIdentity(input) {
  const label = normalizeDisplayText(input);
  const normalizedName = normalizeEquipmentName(label);

  return {
    label,
    normalizedName,
    slug: createSlug(label, "equipment"),
  };
}
