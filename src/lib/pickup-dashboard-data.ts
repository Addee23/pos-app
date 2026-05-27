import { PickupStatus } from "@/generated/prisma/client";
import { PICKUP_DASHBOARD_LIMIT } from "@/lib/pickup-dashboard";
import { prisma } from "@/lib/prisma";
import { serializePickup, type SerializedPickup } from "@/lib/pickup-serialize";

const pickupInclude = {
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
  const readyWhere = { storeId, status: PickupStatus.READY };

  const [needsHandlingRows, readyForPickupRows, needsHandlingCount, readyForPickupCount] =
    await Promise.all([
      prisma.pickup.findMany({
        where: { ...readyWhere, readyEmailSentAt: null },
        include: pickupInclude,
        orderBy: { createdAt: "desc" },
        take: PICKUP_DASHBOARD_LIMIT,
      }),
      prisma.pickup.findMany({
        where: { ...readyWhere, readyEmailSentAt: { not: null } },
        include: pickupInclude,
        orderBy: { createdAt: "desc" },
        take: PICKUP_DASHBOARD_LIMIT,
      }),
      prisma.pickup.count({
        where: { ...readyWhere, readyEmailSentAt: null },
      }),
      prisma.pickup.count({
        where: { ...readyWhere, readyEmailSentAt: { not: null } },
      }),
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
