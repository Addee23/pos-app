import { prisma } from "@/lib/prisma";

/** Synkar upphämtningsrader med produktkatalogen (bild + namn från JSON-import). */
export async function syncPickupItemsFromCatalog(pickupId: string): Promise<void> {
  const items = await prisma.pickupItem.findMany({
    where: { pickupId },
    include: {
      pickup: { select: { storeId: true } },
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          metaDescription: true,
        },
      },
      variant: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          metaDescription: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              imageUrl: true,
              metaDescription: true,
            },
          },
        },
      },
    },
  });

  for (const item of items) {
    let product = item.product ?? item.variant?.product ?? null;
    let variant = item.variant;

    if (!product && item.productSlug) {
      product = await prisma.product.findFirst({
        where: {
          storeId: item.pickup.storeId,
          slug: item.productSlug,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          metaDescription: true,
        },
      });
    }

    if (!product) {
      continue;
    }

    if (item.variantId && !variant) {
      variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          metaDescription: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              imageUrl: true,
              metaDescription: true,
            },
          },
        },
      });
    }

    const imageUrl = variant?.imageUrl ?? product.imageUrl;

    await prisma.pickupItem.update({
      where: { id: item.id },
      data: {
        productId: product.id,
        variantId: variant?.id ?? null,
        productName: product.name,
        variantName: variant?.name ?? null,
        productSlug: product.slug,
        productImageUrl: imageUrl,
      },
    });
  }
}
