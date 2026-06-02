import type { PrismaClient, Product, ProductVariant } from "@/generated/prisma/client";
import {
  canLoadWooVariations,
  fetchAllWooProducts,
  fetchLatestWooProducts,
  hasWooCredentials,
  loadWooVariations,
  type StoreWooCredentials,
} from "@/lib/woocommerce-api";
import {
  normalizeWooProducts,
  type ImportedWooProduct,
  type ImportedWooVariant,
} from "@/lib/woocommerce-products";

export { fetchAllWooProducts, fetchLatestWooProducts, hasWooCredentials };
export type { StoreWooCredentials };

export type ImportProductsResult = {
  createdProducts: number;
  updatedProducts: number;
  unchangedProducts: number;
  createdVariants: number;
  updatedVariants: number;
  unchangedVariants: number;
  skippedProducts: number;
  updateOnly: boolean;
  /** Skapade + uppdaterade produkter (bakåtkompatibelt). */
  importedProducts: number;
  /** Skapade + uppdaterade varianter (bakåtkompatibelt). */
  importedVariants: number;
};

type StoreForImport = StoreWooCredentials & {
  id: string;
};

type ExistingProduct = Product & {
  variants: ProductVariant[];
};

export async function importWooProductsForStore(
  prisma: PrismaClient,
  store: StoreForImport,
  rawProducts: unknown[],
  options: { updateOnly?: boolean } = {},
): Promise<ImportProductsResult> {
  const updateOnly = options.updateOnly === true;

  const products = await normalizeWooProducts({
    products: rawProducts,
    loadVariations: canLoadWooVariations(store)
      ? (productId) => loadWooVariations(store, productId)
      : undefined,
  });

  const result: ImportProductsResult = {
    createdProducts: 0,
    updatedProducts: 0,
    unchangedProducts: 0,
    createdVariants: 0,
    updatedVariants: 0,
    unchangedVariants: 0,
    skippedProducts: 0,
    updateOnly,
    importedProducts: 0,
    importedVariants: 0,
  };

  for (const product of products) {
    const existing = await prisma.product.findUnique({
      where: {
        storeId_wooProductId: {
          storeId: store.id,
          wooProductId: product.wooProductId,
        },
      },
      include: { variants: true },
    });

    if (!existing) {
      if (updateOnly) {
        result.skippedProducts += 1;
        continue;
      }

      const savedProduct = await createProduct(prisma, store.id, product);
      result.createdProducts += 1;
      result.importedProducts += 1;

      for (const variant of product.variants) {
        await createVariant(prisma, savedProduct.id, variant);
        result.createdVariants += 1;
        result.importedVariants += 1;
      }

      continue;
    }

    const productPayload = productWritePayload(product);

    if (hasProductChanges(existing, product)) {
      await prisma.product.update({
        where: { id: existing.id },
        data: productPayload,
      });
      result.updatedProducts += 1;
      result.importedProducts += 1;
    } else {
      result.unchangedProducts += 1;
    }

    const variantResult = await syncVariants(prisma, existing, product.variants);
    result.createdVariants += variantResult.created;
    result.updatedVariants += variantResult.updated;
    result.unchangedVariants += variantResult.unchanged;
    result.importedVariants += variantResult.created + variantResult.updated;
  }

  return result;
}

function productWritePayload(product: ImportedWooProduct) {
  return {
    name: product.name,
    slug: product.slug,
    permalink: product.permalink,
    productType: product.productType,
    price: product.price,
    ean: product.ean,
    imageUrl: product.imageUrl,
    metaDescription: product.metaDescription,
    shortDescription: product.shortDescription,
    category: product.category,
    brand: product.brand,
    country: product.country,
    stockQuantity: product.stockQuantity,
  };
}

function variantWritePayload(variant: ImportedWooVariant) {
  return {
    name: variant.name,
    price: variant.price,
    ean: variant.ean,
    imageUrl: variant.imageUrl,
    metaDescription: variant.metaDescription,
    shortDescription: variant.shortDescription,
    stockQuantity: variant.stockQuantity,
  };
}

async function createProduct(
  prisma: PrismaClient,
  storeId: string,
  product: ImportedWooProduct,
) {
  return prisma.product.create({
    data: {
      storeId,
      wooProductId: product.wooProductId,
      ...productWritePayload(product),
    },
    select: { id: true },
  });
}

async function createVariant(
  prisma: PrismaClient,
  productId: string,
  variant: ImportedWooVariant,
) {
  await prisma.productVariant.create({
    data: {
      productId,
      wooVariantId: variant.wooVariantId,
      ...variantWritePayload(variant),
    },
  });
}

async function syncVariants(
  prisma: PrismaClient,
  existing: ExistingProduct,
  incomingVariants: ImportedWooVariant[],
): Promise<{ created: number; updated: number; unchanged: number }> {
  const counts = { created: 0, updated: 0, unchanged: 0 };

  for (const variant of incomingVariants) {
    const existingVariant = existing.variants.find(
      (item) => item.wooVariantId === variant.wooVariantId,
    );

    if (!existingVariant) {
      await createVariant(prisma, existing.id, variant);
      counts.created += 1;
      continue;
    }

    if (hasVariantChanges(existingVariant, variant)) {
      await prisma.productVariant.update({
        where: { id: existingVariant.id },
        data: variantWritePayload(variant),
      });
      counts.updated += 1;
    } else {
      counts.unchanged += 1;
    }
  }

  return counts;
}

function hasProductChanges(
  existing: ExistingProduct,
  incoming: ImportedWooProduct,
): boolean {
  return (
    existing.name !== incoming.name ||
    existing.slug !== incoming.slug ||
    existing.permalink !== incoming.permalink ||
    existing.productType !== incoming.productType ||
    comparePrice(existing.price, incoming.price) !== 0 ||
    existing.ean !== incoming.ean ||
    existing.imageUrl !== incoming.imageUrl ||
    existing.metaDescription !== incoming.metaDescription ||
    existing.shortDescription !== incoming.shortDescription ||
    existing.category !== incoming.category ||
    existing.brand !== incoming.brand ||
    existing.country !== incoming.country ||
    existing.stockQuantity !== incoming.stockQuantity
  );
}

function hasVariantChanges(
  existing: ProductVariant,
  incoming: ImportedWooVariant,
): boolean {
  return (
    existing.name !== incoming.name ||
    comparePrice(existing.price, incoming.price) !== 0 ||
    existing.ean !== incoming.ean ||
    existing.imageUrl !== incoming.imageUrl ||
    existing.metaDescription !== incoming.metaDescription ||
    existing.shortDescription !== incoming.shortDescription ||
    existing.stockQuantity !== incoming.stockQuantity
  );
}

function comparePrice(left: unknown, right: string): number {
  const normalizedLeft = Number(normalizePrice(left));
  const normalizedRight = Number(normalizePrice(right));

  if (normalizedLeft === normalizedRight) {
    return 0;
  }

  return normalizedLeft > normalizedRight ? 1 : -1;
}

function normalizePrice(value: unknown): string {
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price.toFixed(2) : "0.00";
}
