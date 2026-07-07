import { PickupStatus } from "@/generated/prisma/client";
import { PICKUP_DASHBOARD_LIMIT } from "@/lib/pickup-dashboard";
import { prisma } from "@/lib/prisma";
import { pickupResponseInclude, serializePickup, type SerializedPickup } from "@/lib/pickup-serialize";

const pickupInclude = pickupResponseInclude;

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
  storeIds: string[] | null,
): Promise<PickupDashboardPayload> {
  const storeFilter = storeIds === null ? {} : { storeId: { in: storeIds } };
  const awaitingWhere = { ...storeFilter, status: PickupStatus.AWAITING_PACK };
  const readyWhere = { ...storeFilter, status: PickupStatus.READY };

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
