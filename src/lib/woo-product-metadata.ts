type WooObject = Record<string, unknown>;

/** Produktmeta från Woo – sparas i databasen. Plugin-fält filtreras bort. */
export const WOO_PRODUCT_META_KEYS = [
  "land",
  "nyborjarvanligt",
  "tubos",
  "handrullad",
  "format",
  "tackblad",
  "kropp",
  "smak",
  "filler",
  "roktid",
  "matt",
  "vikt",
] as const;

export type WooProductMetaKey = (typeof WOO_PRODUCT_META_KEYS)[number];

export function isIgnoredWooMetaKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  if (normalized.startsWith("rank_math")) {
    return true;
  }

  if (normalized.startsWith("qoc_")) {
    return true;
  }

  if (normalized.startsWith("_")) {
    return true;
  }

  return false;
}

export function shouldKeepWooMetaKey(key: string): boolean {
  return !isIgnoredWooMetaKey(key);
}

export function extractWooProductMetadata(
  product: WooObject,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};

  for (const meta of asArray(product.meta_data).map(asObject)) {
    if (!meta) {
      continue;
    }

    const key = asString(meta.key);
    if (!shouldKeepWooMetaKey(key)) {
      continue;
    }

    const value = normalizeStoredMetaValue(meta.value);
    if (isEmptyMetaValue(value)) {
      continue;
    }

    metadata[key] = value;
  }

  return metadata;
}

export function normalizeStoredMetaValue(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => normalizeStoredMetaValue(item))
      .filter((item) => !isEmptyMetaValue(item));

    return items.length > 0 ? items : null;
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(record)) {
      const next = normalizeStoredMetaValue(entry);
      if (!isEmptyMetaValue(next)) {
        normalized[key] = next;
      }
    }

    return Object.keys(normalized).length > 0 ? normalized : null;
  }

  return null;
}

export function formatStoredMetaValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => formatStoredMetaValue(item))
      .filter((item): item is string => Boolean(item));

    return parts.length > 0 ? parts.join(", ") : null;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const active = Object.entries(record)
      .filter(([, entry]) => entry === true || entry === "true" || entry === "Ja")
      .map(([key]) => key);

    if (active.length > 0) {
      return active.join(", ");
    }

    const parts = Object.entries(record)
      .map(([key, entry]) => {
        const formatted = formatStoredMetaValue(entry);
        return formatted ? `${key}: ${formatted}` : null;
      })
      .filter((item): item is string => Boolean(item));

    return parts.length > 0 ? parts.join(" · ") : null;
  }

  return null;
}

export function extractStoredMetaGroupValues(
  metadata: Record<string, unknown> | null | undefined,
  field: string,
): string[] {
  if (!metadata) {
    return [];
  }

  const key = resolveMetadataKey(metadata, field);
  if (!key) {
    return [];
  }

  const value = metadata[key];
  const formatted = formatStoredMetaValue(value);
  return formatted ? [formatted] : [];
}

export function readStoredMetaField(
  metadata: Record<string, unknown> | null | undefined,
  field: string,
): string | null {
  if (!metadata) {
    return null;
  }

  const key = resolveMetadataKey(metadata, field);
  if (!key) {
    return null;
  }

  return formatStoredMetaValue(metadata[key]);
}

export function collectAvailableMetaKeys(
  products: Array<{ wooMetadata: unknown }>,
): string[] {
  const keys = new Set<string>();

  for (const product of products) {
    const metadata = asMetadataRecord(product.wooMetadata);
    if (!metadata) {
      continue;
    }

    for (const key of Object.keys(metadata)) {
      keys.add(key);
    }
  }

  return [...keys].sort((a, b) => a.localeCompare(b, "sv"));
}

export function asMetadataRecord(
  value: unknown,
): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function resolveMetadataKey(
  metadata: Record<string, unknown>,
  field: string,
): string | null {
  const normalized = field.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const exact = Object.keys(metadata).find(
    (key) => key.toLowerCase() === normalized,
  );

  return exact ?? null;
}

function isEmptyMetaValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length === 0;
  }

  return false;
}

function asObject(value: unknown): WooObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as WooObject)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
