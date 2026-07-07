type PickupWithRelations = {
  id: string;
  storeId: string;
  customerName: string;
  customerEmail: string | null;
  pickupCode: string;
  status: "AWAITING_PACK" | "READY" | "PICKED_UP" | "CANCELLED";
  notes: string | null;
  readyEmailSentAt: Date | null;
  packedAt: Date | null;
  pickedUpAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  packedBy: { name: string; email: string } | null;
  pickedUpBy: { name: string; email: string } | null;
  cancelledBy: { name: string; email: string } | null;
  items: Array<{
    id: string;
    productName: string;
    variantName: string | null;
    productSlug: string | null;
    productImageUrl: string | null;
    quantity: number;
    variant: { stockLocation: string | null } | null;
    product: { stockLocation: string | null } | null;
  }>;
};

export type SerializedPickup = {
  id: string;
  storeId: string;
  customerName: string;
  customerEmail: string | null;
  pickupCode: string;
  status: "AWAITING_PACK" | "READY" | "PICKED_UP" | "CANCELLED";
  notes: string | null;
  readyEmailSentAt: string | null;
  packedAt: string | null;
  pickedUpAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  packedBy: { name: string; email: string } | null;
  pickedUpBy: { name: string; email: string } | null;
  cancelledBy: { name: string; email: string } | null;
  items: Array<{
    id: string;
    productName: string;
    variantName: string | null;
    productSlug: string | null;
    productImageUrl: string | null;
    quantity: number;
    stockLocation: string | null;
  }>;
};

export function serializePickup(pickup: PickupWithRelations): SerializedPickup {
  return {
    id: pickup.id,
    storeId: pickup.storeId,
    customerName: pickup.customerName,
    customerEmail: pickup.customerEmail,
    pickupCode: pickup.pickupCode,
    status: pickup.status,
    notes: pickup.notes,
    readyEmailSentAt: pickup.readyEmailSentAt?.toISOString() ?? null,
    packedAt: pickup.packedAt?.toISOString() ?? null,
    pickedUpAt: pickup.pickedUpAt?.toISOString() ?? null,
    cancelledAt: pickup.cancelledAt?.toISOString() ?? null,
    createdAt: pickup.createdAt.toISOString(),
    packedBy: pickup.packedBy,
    pickedUpBy: pickup.pickedUpBy,
    cancelledBy: pickup.cancelledBy,
    items: pickup.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      variantName: item.variantName,
      productSlug: item.productSlug,
      productImageUrl: item.productImageUrl,
      quantity: item.quantity,
      stockLocation: item.variant?.stockLocation ?? item.product?.stockLocation ?? null,
    })),
  };
}

export const pickupResponseInclude = {
  packedBy: { select: { name: true, email: true } },
  pickedUpBy: { select: { name: true, email: true } },
  cancelledBy: { select: { name: true, email: true } },
  items: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      productName: true,
      variantName: true,
      productSlug: true,
      productImageUrl: true,
      quantity: true,
      variant: { select: { stockLocation: true } },
      product: { select: { stockLocation: true } },
    },
  },
} as const;
