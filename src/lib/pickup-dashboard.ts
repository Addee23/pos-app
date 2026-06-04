import type { PickupStatus } from "@/generated/prisma/client";

export const PICKUP_DASHBOARD_LIMIT = 10;
export const PICKUP_DASHBOARD_REFRESH_MS = 60_000;

export type PickupDashboardTab = "needsHandling" | "readyForPickup";

type PickupForClassification = {
  status: PickupStatus;
};

/** Woo-order mottagen — väntar på att personal packar och skickar mail. */
export function isPickupNeedsHandling(pickup: PickupForClassification): boolean {
  return pickup.status === "AWAITING_PACK";
}

/** Packad och notifierad — kunden kan hämta. */
export function isPickupReadyForPickup(pickup: PickupForClassification): boolean {
  return pickup.status === "READY";
}

export function classifyPickupTab(
  pickup: PickupForClassification,
): PickupDashboardTab | null {
  if (isPickupNeedsHandling(pickup)) {
    return "needsHandling";
  }
  if (isPickupReadyForPickup(pickup)) {
    return "readyForPickup";
  }
  return null;
}

export const PICKUP_TAB_LABELS: Record<PickupDashboardTab, string> = {
  needsHandling: "Ska packas",
  readyForPickup: "Redo att hämtas",
};
