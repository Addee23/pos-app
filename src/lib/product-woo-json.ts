import type { Product, ProductVariant } from "@/generated/prisma/client";

type ProductWithVariants = Product & {
  variants: ProductVariant[];
};

/** WooCommerce-liknande JSON för export / redigering / återimport. */
export function productToWooJson(product: ProductWithVariants): Record<string, unknown> {
  const type = product.productType === "VARIABLE" ? "variable" : "simple";

  const base: Record<string, unknown> = {
    id: product.wooProductId,
    name: product.name,
    slug: product.slug,
    type,
    permalink: product.permalink ?? undefined,
    sku: product.ean ?? "",
    price: Number(product.price).toFixed(2),
    stock_quantity: product.stockQuantity,
    short_description: product.shortDescription ?? "",
    description: "",
    images: product.imageUrl ? [{ src: product.imageUrl }] : [],
    meta_data: product.metaDescription
      ? [{ key: "rank_math_description", value: product.metaDescription }]
      : [],
  };

  if (product.category) {
    base.categories = [{ name: product.category }];
  }

  const attributes: Array<{ name: string; options: string[] }> = [];
  if (product.brand) {
    attributes.push({ name: "Varumärke", options: [product.brand] });
  }
  if (product.country) {
    attributes.push({ name: "Land", options: [product.country] });
  }
  if (attributes.length > 0) {
    base.attributes = attributes;
  }

  if (product.productType === "VARIABLE" && product.variants.length > 0) {
    base.variations = product.variants.map((variant) => variantToWooJson(variant, product));
  }

  return base;
}

function variantToWooJson(
  variant: ProductVariant,
  product: Product,
): Record<string, unknown> {
  return {
    id: variant.wooVariantId,
    name: variant.name,
    sku: variant.ean ?? "",
    price: Number(variant.price).toFixed(2),
    stock_quantity: variant.stockQuantity,
    short_description: variant.shortDescription ?? product.shortDescription ?? "",
    images: variant.imageUrl
      ? [{ src: variant.imageUrl }]
      : product.imageUrl
        ? [{ src: product.imageUrl }]
        : [],
    meta_data: variant.metaDescription
      ? [{ key: "rank_math_description", value: variant.metaDescription }]
      : product.metaDescription
        ? [{ key: "rank_math_description", value: product.metaDescription }]
        : [],
  };
}

export function formatWooJsonForEditor(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function parseProductsFromJsonInput(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    Array.isArray((parsed as { products?: unknown }).products)
  ) {
    return (parsed as { products: unknown[] }).products;
  }

  return null;
}
