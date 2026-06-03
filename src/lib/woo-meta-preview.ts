import {
  asMetadataRecord,
  collectAvailableMetaKeys,
  extractStoredMetaGroupValues,
  readStoredMetaField,
  WOO_PRODUCT_META_KEYS,
} from "@/lib/woo-product-metadata";

type WooObject = Record<string, unknown>;

const UNSET_KEY = "";

export type WooMetaPreviewRow = {
  key: string;
  label: string;
  productCount: number;
  systemMeta: string | null;
  uxMeta: string | null;
  mixedSystemMeta: boolean;
  mixedUxMeta: boolean;
  sampleProductName: string | null;
};

export type StoredProductMetaSource = {
  name: string;
  metaDescription: string | null;
  shortDescription: string | null;
  wooMetadata: unknown;
};

export const WOO_META_FIELD_SUGGESTIONS = WOO_PRODUCT_META_KEYS.map((key) => ({
  input: key,
  label: key,
}));

export { collectAvailableMetaKeys };

export function normalizeWooMetaFieldInput(value: string): string {
  return value.trim();
}

export function buildStoredMetaPreviewRows(
  products: StoredProductMetaSource[],
  fieldInput: string,
): WooMetaPreviewRow[] {
  const field = normalizeWooMetaFieldInput(fieldInput);
  if (!field) {
    return [];
  }

  const groups = new Map<
    string,
    Array<{
      systemMeta: string | null;
      uxMeta: string | null;
      name: string;
    }>
  >();

  for (const product of products) {
    const metadata = asMetadataRecord(product.wooMetadata);
    const groupValues = extractStoredMetaGroupValues(metadata, field);

    if (groupValues.length === 0) {
      appendStoredGroup(groups, UNSET_KEY, product, field, metadata);
      continue;
    }

    for (const groupValue of groupValues) {
      appendStoredGroup(groups, groupValue, product, field, metadata);
    }
  }

  return [...groups.entries()]
    .map(([key, entries]) => {
      const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name, "sv"));
      const first = sorted[0];
      const systemValues = new Set(entries.map((entry) => entry.systemMeta ?? ""));
      const uxValues = new Set(entries.map((entry) => entry.uxMeta ?? ""));

      return {
        key,
        label: key === UNSET_KEY ? `(saknar ${field})` : key,
        productCount: entries.length,
        systemMeta: first?.systemMeta ?? null,
        uxMeta: first?.uxMeta ?? null,
        mixedSystemMeta: systemValues.size > 1,
        mixedUxMeta: uxValues.size > 1,
        sampleProductName: first?.name ?? null,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "sv"));
}

function appendStoredGroup(
  groups: Map<
    string,
    Array<{ systemMeta: string | null; uxMeta: string | null; name: string }>
  >,
  key: string,
  product: StoredProductMetaSource,
  field: string,
  metadata: Record<string, unknown> | null,
) {
  const bucket = groups.get(key);
  const entry = {
    systemMeta: product.metaDescription?.trim() || null,
    uxMeta:
      readStoredMetaField(metadata, field) ||
      product.shortDescription?.trim() ||
      null,
    name: product.name,
  };

  if (bucket) {
    bucket.push(entry);
  } else {
    groups.set(key, [entry]);
  }
}

export function buildWooMetaPreviewRows(
  products: unknown[],
  fieldInput: string,
): WooMetaPreviewRow[] {
  const field = normalizeWooMetaFieldInput(fieldInput);
  if (!field) {
    return [];
  }

  const groups = new Map<
    string,
    Array<{ systemMeta: string | null; uxMeta: string | null; name: string }>
  >();

  for (const item of products) {
    const product = asObject(item);
    if (!product) {
      continue;
    }

    const name = asString(product.name) || "Okänd produkt";
    const groupValues = extractWooGroupValues(product, field);

    if (groupValues.length === 0) {
      appendGroup(groups, UNSET_KEY, product, name);
      continue;
    }

    for (const groupValue of groupValues) {
      appendGroup(groups, groupValue, product, name);
    }
  }

  return [...groups.entries()]
    .map(([key, entries]) => {
      const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name, "sv"));
      const first = sorted[0];
      const systemValues = new Set(entries.map((entry) => entry.systemMeta ?? ""));
      const uxValues = new Set(entries.map((entry) => entry.uxMeta ?? ""));

      return {
        key,
        label: key === UNSET_KEY ? `(saknar ${field})` : key,
        productCount: entries.length,
        systemMeta: first?.systemMeta ?? null,
        uxMeta: first?.uxMeta ?? null,
        mixedSystemMeta: systemValues.size > 1,
        mixedUxMeta: uxValues.size > 1,
        sampleProductName: first?.name ?? null,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "sv"));
}

export function extractWooSystemMeta(product: WooObject): string | null {
  const fromMeta = extractMetaDataValue(product, "rank_math_description");
  if (fromMeta) {
    return fromMeta;
  }

  return null;
}

export function extractWooUxMeta(product: WooObject): string | null {
  const shortDescription = asString(product.short_description);
  if (shortDescription) {
    return shortDescription;
  }

  return null;
}

function appendGroup(
  groups: Map<
    string,
    Array<{ systemMeta: string | null; uxMeta: string | null; name: string }>
  >,
  key: string,
  product: WooObject,
  name: string,
) {
  const bucket = groups.get(key);
  const entry = {
    systemMeta: extractWooSystemMeta(product),
    uxMeta: extractWooUxMeta(product),
    name,
  };

  if (bucket) {
    bucket.push(entry);
  } else {
    groups.set(key, [entry]);
  }
}

function extractWooGroupValues(product: WooObject, field: string): string[] {
  const normalized = field.trim().toLowerCase();

  if (normalized.startsWith("meta_data.") || normalized.startsWith("meta:")) {
    const key = field.split(/[.:]/).slice(1).join(".");
    const value = extractMetaDataValue(product, key);
    return value ? [value] : [];
  }

  switch (normalized) {
    case "name":
      return asString(product.name) ? [asString(product.name)] : [];
    case "brands":
    case "brand":
    case "varumärke":
    case "varumarke":
      return extractNamedItems(product.brands);
    case "categories":
    case "category":
    case "kategori":
      return extractNamedItems(product.categories);
    case "tags":
    case "tag":
      return extractNamedItems(product.tags);
    case "land":
    case "country":
      return uniqueNonEmpty([
        extractMetaDataValue(product, "land"),
        extractAttributeOption(product, ["land", "ursprungsland", "country"]),
      ]);
    case "rank_math_description":
      return uniqueNonEmpty([extractMetaDataValue(product, "rank_math_description")]);
    case "short_description":
      return uniqueNonEmpty([asString(product.short_description)]);
    default:
      return uniqueNonEmpty([
        extractMetaDataValue(product, field.trim()),
        extractAttributeOption(product, [field.trim()]),
      ]);
  }
}

function extractMetaDataValue(product: WooObject, key: string): string | null {
  for (const meta of asArray(product.meta_data).map(asObject)) {
    if (!meta) {
      continue;
    }

    if (asString(meta.key).toLowerCase() !== key.toLowerCase()) {
      continue;
    }

    const value = formatMetaValue(meta.value);
    if (value) {
      return value;
    }
  }

  return null;
}

function extractAttributeOption(
  product: WooObject,
  candidates: string[],
): string | null {
  for (const attribute of asArray(product.attributes).map(asObject)) {
    if (!attribute) {
      continue;
    }

    const slug = asString(attribute.slug).toLowerCase();
    const name = asString(attribute.name).toLowerCase();
    const matches = candidates.some(
      (candidate) =>
        slug === candidate.toLowerCase() || name === candidate.toLowerCase(),
    );

    if (!matches) {
      continue;
    }

    const option = asArray(attribute.options)
      .map((value) => formatMetaValue(value))
      .find(Boolean);

    if (option) {
      return option;
    }
  }

  return null;
}

function extractNamedItems(value: unknown): string[] {
  return uniqueNonEmpty(
    asArray(value)
      .map(asObject)
      .map((item) => asString(item?.name))
      .filter(Boolean),
  );
}

function formatMetaValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => formatMetaValue(item))
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(", ") : null;
  }

  return null;
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    result.push(trimmed);
  }

  return result;
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
