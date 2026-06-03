import type { ProductType } from "@/generated/prisma/client";
import {
  extractWooBrand,
  extractWooCategory,
  extractWooCountry,
} from "@/lib/woo-product-taxonomy";
import { inferProductTaxonomy } from "@/lib/product-taxonomy-options";
import { extractWooProductMetadata } from "@/lib/woo-product-metadata";

export type WooProductImportInput = {
  products: unknown[];
  loadVariations?: (productId: number) => Promise<unknown[]>;
};

export type ImportedWooProduct = {
  wooProductId: number;
  name: string;
  slug: string;
  permalink: string | null;
  productType: ProductType;
  price: string;
  ean: string | null;
  stockQuantity: number;
  imageUrl: string | null;
  /** SEO (Rank Math) – används i sök, inte i kundmail. */
  metaDescription: string | null;
  /** Produktinfo från JSON: short_description / description. */
  shortDescription: string | null;
  category: string | null;
  brand: string | null;
  country: string | null;
  wooMetadata: Record<string, unknown>;
  variants: ImportedWooVariant[];
};

export type ImportedWooVariant = {
  wooVariantId: number;
  name: string;
  price: string;
  ean: string | null;
  stockQuantity: number;
  imageUrl: string | null;
  metaDescription: string | null;
  shortDescription: string | null;
};

type WooObject = Record<string, unknown>;

export async function normalizeWooProducts({
  products,
  loadVariations,
}: WooProductImportInput): Promise<ImportedWooProduct[]> {
  const normalized: ImportedWooProduct[] = [];

  for (const item of products) {
    const product = asObject(item);
    if (!product) {
      continue;
    }

    const wooProductId = asNumber(product.id);
    const name = asString(product.name);
    if (!wooProductId || !name) {
      continue;
    }

    const productType = asString(product.type) === "variable" ? "VARIABLE" : "SIMPLE";
    const variationDetails = await resolveVariationDetails(product, loadVariations);

    const shortDescription = productShortInfo(product);
    const category =
      extractWooCategory(product) ??
      inferProductTaxonomy({ name, shortDescription }).category;
    const brand =
      extractWooBrand(product) ??
      inferProductTaxonomy({ name, shortDescription }).brand;
    const country =
      extractWooCountry(product) ??
      inferProductTaxonomy({ name, shortDescription, brand }).country;

    normalized.push({
      wooProductId,
      name,
      slug: asString(product.slug) || slugify(name),
      permalink: asString(product.permalink) || null,
      productType,
      price: normalizePrice(product.price),
      ean: asString(product.sku) || null,
      stockQuantity: normalizeStock(product.stock_quantity),
      imageUrl: firstImageUrl(product),
      metaDescription: seoMetaDescription(product),
      shortDescription,
      category,
      brand,
      country,
      wooMetadata: extractWooProductMetadata(product),
      variants: variationDetails.map((variant, index) =>
        normalizeVariant(variant, product, index),
      ),
    });
  }

  return normalized;
}

async function resolveVariationDetails(
  product: WooObject,
  loadVariations?: (productId: number) => Promise<unknown[]>,
): Promise<WooObject[]> {
  const productId = asNumber(product.id);
  const rawVariations = asArray(product.variations);
  const inlineVariations = rawVariations
    .map(asObject)
    .filter((variation): variation is WooObject => Boolean(variation));

  if (inlineVariations.length > 0) {
    return inlineVariations;
  }

  if (productId && rawVariations.length > 0 && loadVariations) {
    const loaded = await loadVariations(productId);
    return loaded
      .map(asObject)
      .filter((variation): variation is WooObject => Boolean(variation));
  }

  return rawVariations
    .map((variationId, index) => ({
      id: variationId,
      name: variationNameFromAttributes(product, index),
      price: product.price,
      sku: "",
      stock_quantity: product.stock_quantity,
    }))
    .filter((variation) => asNumber(variation.id));
}

function normalizeVariant(
  variant: WooObject,
  product: WooObject,
  index: number,
): ImportedWooVariant {
  const attributes = asArray(variant.attributes)
    .map(asObject)
    .filter((attribute): attribute is WooObject => Boolean(attribute));
  const attributeName = attributes
    .map((attribute) => asString(attribute.option) || asString(attribute.name))
    .filter(Boolean)
    .join(", ");

  return {
    wooVariantId: asNumber(variant.id) ?? index + 1,
    name:
      asString(variant.name) ||
      attributeName ||
      variationNameFromAttributes(product, index) ||
      `Variant ${index + 1}`,
    price: normalizePrice(variant.price || product.price),
    ean: asString(variant.sku) || null,
    stockQuantity: normalizeStock(variant.stock_quantity),
    imageUrl: firstImageUrl(variant) ?? firstImageUrl(product),
    metaDescription:
      seoMetaDescription(variant) ?? seoMetaDescription(product),
    shortDescription:
      productShortInfo(variant) ?? productShortInfo(product),
  };
}

function variationNameFromAttributes(product: WooObject, index: number): string {
  const attributes = asArray(product.attributes)
    .map(asObject)
    .filter((attribute): attribute is WooObject => Boolean(attribute));
  const options = attributes.flatMap((attribute) => asArray(attribute.options));
  return asString(options[index]) || "";
}

/** Produktinfo som visas för kund (Woo short_description, annars description). */
function productShortInfo(value: WooObject): string | null {
  const short = stripHtml(asString(value.short_description));
  if (short) {
    return short.slice(0, 800);
  }

  const description = stripHtml(asString(value.description));
  return description ? description.slice(0, 800) : null;
}

/** SEO-metabeskrivning (Rank Math) – intern/sök, inte kundmail. */
function seoMetaDescription(value: WooObject): string | null {
  const metadata = asArray(value.meta_data)
    .map(asObject)
    .find((meta) => meta?.key === "rank_math_description");
  const rankMathDescription = metadata ? asString(metadata.value) : "";
  return rankMathDescription ? rankMathDescription.slice(0, 500) : null;
}

function firstImageUrl(value: WooObject): string | null {
  const firstImage = asObject(asArray(value.images)[0]);
  return firstImage ? asString(firstImage.src) || null : null;
}

function normalizePrice(value: unknown): string {
  const price = Number(asString(value) || value);
  return Number.isFinite(price) && price >= 0 ? price.toFixed(2) : "0.00";
}

function normalizeStock(value: unknown): number {
  const stock = Number(value);
  return Number.isInteger(stock) && stock > 0 ? stock : 0;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function asNumber(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) ? numberValue : null;
}
