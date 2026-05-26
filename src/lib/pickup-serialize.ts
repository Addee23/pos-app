type PickupWithRelations = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  pickupCode: string;
  status: "READY" | "PICKED_UP" | "CANCELLED";
  notes: string | null;
  readyEmailSentAt: Date | null;
  pickedUpAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  pickedUpBy: { name: string; email: string } | null;
  cancelledBy: { name: string; email: string } | null;
  items: Array<{
    id: string;
    productName: string;
    variantName: string | null;
    productSlug: string | null;
    productImageUrl: string | null;
    quantity: number;
  }>;
};

export type SerializedPickup = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  pickupCode: string;
  status: "READY" | "PICKED_UP" | "CANCELLED";
  notes: string | null;
  readyEmailSentAt: string | null;
  pickedUpAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  pickedUpBy: { name: string; email: string } | null;
  cancelledBy: { name: string; email: string } | null;
  items: PickupWithRelations["items"];
};

export function serializePickup(pickup: PickupWithRelations): SerializedPickup {
  return {
    id: pickup.id,
    customerName: pickup.customerName,
    customerEmail: pickup.customerEmail,
    pickupCode: pickup.pickupCode,
    status: pickup.status,
    notes: pickup.notes,
    readyEmailSentAt: pickup.readyEmailSentAt?.toISOString() ?? null,
    pickedUpAt: pickup.pickedUpAt?.toISOString() ?? null,
    cancelledAt: pickup.cancelledAt?.toISOString() ?? null,
    createdAt: pickup.createdAt.toISOString(),
    pickedUpBy: pickup.pickedUpBy,
    cancelledBy: pickup.cancelledBy,
    items: pickup.items,
  };
}
