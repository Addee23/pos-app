import type { PrismaClient } from "@/generated/prisma/client";
import {
  canLoadWooVariations,
  fetchAllWooProducts,
  fetchLatestWooProducts,
  hasWooCredentials,
  loadWooVariations,
  type StoreWooCredentials,
} from "@/lib/woocommerce-api";
import { normalizeWooProducts } from "@/lib/woocommerce-products";

export { fetchAllWooProducts, fetchLatestWooProducts, hasWooCredentials };
export type { StoreWooCredentials };

export type ImportProductsResult = {
  importedProducts: number;
  importedVariants: number;
  skippedProducts: number;
  updateOnly: boolean;
};

type StoreForImport = StoreWooCredentials & {
  id: string;
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

  let importedProducts = 0;
  let importedVariants = 0;
  let skippedProducts = 0;

  for (const product of products) {
    if (updateOnly) {
      const existing = await prisma.product.findUnique({
        where: {
          storeId_wooProductId: {
            storeId: store.id,
            wooProductId: product.wooProductId,
          },
        },
        select: { id: true },
      });

      if (!existing) {
        skippedProducts += 1;
        continue;
      }
    }

    const savedProduct = await prisma.product.upsert({
      where: {
        storeId_wooProductId: {
          storeId: store.id,
          wooProductId: product.wooProductId,
        },
      },
      create: {
        storeId: store.id,
        wooProductId: product.wooProductId,
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
      },
      update: {
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
      },
      select: { id: true },
    });

    importedProducts += 1;

    for (const variant of product.variants) {
      await prisma.productVariant.upsert({
        where: {
          productId_wooVariantId: {
            productId: savedProduct.id,
            wooVariantId: variant.wooVariantId,
          },
        },
        create: {
          productId: savedProduct.id,
          wooVariantId: variant.wooVariantId,
          name: variant.name,
          price: variant.price,
          ean: variant.ean,
          imageUrl: variant.imageUrl,
          metaDescription: variant.metaDescription,
          shortDescription: variant.shortDescription,
          stockQuantity: variant.stockQuantity,
        },
        update: {
          name: variant.name,
          price: variant.price,
          ean: variant.ean,
          imageUrl: variant.imageUrl,
          metaDescription: variant.metaDescription,
          shortDescription: variant.shortDescription,
          stockQuantity: variant.stockQuantity,
        },
      });

      importedVariants += 1;
    }
  }

  return {
    importedProducts,
    importedVariants,
    skippedProducts,
    updateOnly,
  };
}
