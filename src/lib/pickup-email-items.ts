import type { Prisma } from "@/generated/prisma/client";
import type { PickupReadyEmailItem } from "@/lib/mail/pickup-ready-email";

/** Inkludera produkt/varianter så mail hämtar bild + info från JSON-importen. */
export const pickupEmailItemsInclude = {
  orderBy: { createdAt: "asc" as const },
  select: {
    productName: true,
    variantName: true,
    quantity: true,
    productImageUrl: true,
    product: {
      select: {
        name: true,
        imageUrl: true,
        metaDescription: true,
        shortDescription: true,
      },
    },
    variant: {
      select: {
        name: true,
        imageUrl: true,
        metaDescription: true,
        shortDescription: true,
      },
    },
  },
} satisfies Prisma.PickupItemFindManyArgs;

export type PickupItemForEmail = Prisma.PickupItemGetPayload<{
  select: (typeof pickupEmailItemsInclude)["select"];
}>;

/** Bild och beskrivning från produktkatalogen (Woo/JSON), med fallback till snapshot på ordern. */
export function mapPickupItemsToEmailItems(
  items: PickupItemForEmail[],
): PickupReadyEmailItem[] {
  return items.map((item) => {
    const imageUrl =
      item.variant?.imageUrl ??
      item.product?.imageUrl ??
      item.productImageUrl;

    const productInfo =
      item.variant?.metaDescription?.trim() ||
      item.product?.metaDescription?.trim() ||
      item.variant?.shortDescription?.trim() ||
      item.product?.shortDescription?.trim() ||
      null;

    return {
      productName: item.product?.name ?? item.productName,
      variantName: item.variant?.name ?? item.variantName,
      quantity: item.quantity,
      productImageUrl: imageUrl,
      productInfo,
    };
  });
}
