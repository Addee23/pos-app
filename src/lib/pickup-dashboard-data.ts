import { PickupStatus } from "@/generated/prisma/client";
import { PICKUP_DASHBOARD_LIMIT } from "@/lib/pickup-dashboard";
import { prisma } from "@/lib/prisma";
import { serializePickup, type SerializedPickup } from "@/lib/pickup-serialize";

const pickupInclude = {
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
    },
  },
} as const;

export type PickupDashboardPayload = {
  needsHandling: SerializedPickup[];
  readyForPickup: SerializedPickup[];
  counts: {
    needsHandling: number;
    readyForPickup: number;
  };
  fetchedAt: string;
};

export async function loadPickupDashboard(
  storeId: string,
): Promise<PickupDashboardPayload> {
  const awaitingWhere = { storeId, status: PickupStatus.AWAITING_PACK };
  const readyWhere = { storeId, status: PickupStatus.READY };

  const [needsHandlingRows, readyForPickupRows, needsHandlingCount, readyForPickupCount] =
    await Promise.all([
      prisma.pickup.findMany({
        where: awaitingWhere,
        include: pickupInclude,
        orderBy: { createdAt: "desc" },
        take: PICKUP_DASHBOARD_LIMIT,
      }),
      prisma.pickup.findMany({
        where: readyWhere,
        include: pickupInclude,
        orderBy: { createdAt: "desc" },
        take: PICKUP_DASHBOARD_LIMIT,
      }),
      prisma.pickup.count({ where: awaitingWhere }),
      prisma.pickup.count({ where: readyWhere }),
    ]);

  return {
    needsHandling: needsHandlingRows.map(serializePickup),
    readyForPickup: readyForPickupRows.map(serializePickup),
    counts: {
      needsHandling: needsHandlingCount,
      readyForPickup: readyForPickupCount,
    },
    fetchedAt: new Date().toISOString(),
  };
}
