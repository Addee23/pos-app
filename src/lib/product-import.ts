import type { PrismaClient } from "@/generated/prisma/client";
import { decryptSecret } from "@/lib/secret-crypto";
import { normalizeWooProducts } from "@/lib/woocommerce-products";

export type ImportProductsResult = {
  importedProducts: number;
  importedVariants: number;
  skippedProducts: number;
  updateOnly: boolean;
};

type StoreForImport = {
  id: string;
  wooUrl: string | null;
  wooConsumerKey: string | null;
  wooConsumerSecret: string | null;
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

function canLoadWooVariations(store: StoreForImport) {
  return Boolean(store.wooUrl && store.wooConsumerKey && store.wooConsumerSecret);
}

async function loadWooVariations(
  store: StoreForImport,
  productId: number,
): Promise<unknown[]> {
  const wooUrl = store.wooUrl?.replace(/\/$/, "");
  if (!wooUrl || !store.wooConsumerKey || !store.wooConsumerSecret) {
    return [];
  }

  const url = new URL(`${wooUrl}/wp-json/wc/v3/products/${productId}/variations`);
  url.searchParams.set("per_page", "100");
  url.searchParams.set("consumer_key", decryptSecret(store.wooConsumerKey));
  url.searchParams.set("consumer_secret", decryptSecret(store.wooConsumerSecret));

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}
