import {
  normalizeBrand,
  normalizeCategory,
  normalizeCountry,
} from "@/lib/product-taxonomy-options";

type WooObject = Record<string, unknown>;

const BRAND_ATTRIBUTE_NAMES = [
  "varumärke",
  "brand",
  "pa_varumarke",
  "pa_brand",
  "marke",
];

const COUNTRY_ATTRIBUTE_NAMES = [
  "land",
  "country",
  "ursprungsland",
  "pa_land",
  "pa_country",
];

export function extractWooCategory(product: WooObject): string | null {
  const categories = asArray(product.categories)
    .map(asObject)
    .filter((category): category is WooObject => Boolean(category));

  if (categories.length === 0) {
    return null;
  }

  const deepest = categories.at(-1);
  const raw = asString(deepest?.name);
  return raw ? normalizeCategory(raw) : null;
}

export function extractWooBrand(product: WooObject): string | null {
  const raw =
    extractWooAttribute(product, BRAND_ATTRIBUTE_NAMES) ??
    extractWooMetaString(product, ["brand", "_brand", "varumarke"]);

  return raw ? normalizeBrand(raw) : null;
}

export function extractWooCountry(product: WooObject): string | null {
  const raw =
    extractWooAttribute(product, COUNTRY_ATTRIBUTE_NAMES) ??
    extractWooMetaString(product, ["country", "ursprungsland", "_country"]);

  return raw ? normalizeCountry(raw) : null;
}

function extractWooAttribute(
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
        slug === candidate ||
        name === candidate ||
        slug.includes(candidate) ||
        name.includes(candidate),
    );

    if (!matches) {
      continue;
    }

    const option = asArray(attribute.options)
      .map((value) => asString(value))
      .find(Boolean);

    if (option) {
      return option;
    }
  }

  return null;
}

function extractWooMetaString(
  product: WooObject,
  keys: string[],
): string | null {
  for (const meta of asArray(product.meta_data).map(asObject)) {
    if (!meta) {
      continue;
    }

    const key = asString(meta.key).toLowerCase();
    if (!keys.some((candidate) => key === candidate.toLowerCase())) {
      continue;
    }

    const value = asString(meta.value);
    if (value) {
      return value;
    }
  }

  return null;
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
