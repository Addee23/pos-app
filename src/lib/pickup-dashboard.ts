import type { PickupStatus } from "@/generated/prisma/client";

export const PICKUP_DASHBOARD_LIMIT = 10;
export const PICKUP_DASHBOARD_REFRESH_MS = 60_000;

export type PickupDashboardTab = "needsHandling" | "readyForPickup";

type PickupForClassification = {
  status: PickupStatus;
  readyEmailSentAt: Date | string | null;
};

/** Redo men bekräftelsemail ännu inte skickat (eller saknar kundmail). */
export function isPickupNeedsHandling(pickup: PickupForClassification): boolean {
  return pickup.status === "READY" && pickup.readyEmailSentAt == null;
}

/** Redo och kunden har fått (eller ska få) bekräftelse – kan hämtas. */
export function isPickupReadyForPickup(pickup: PickupForClassification): boolean {
  return pickup.status === "READY" && pickup.readyEmailSentAt != null;
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
  needsHandling: "Behöver hanteras",
  readyForPickup: "Redo att hämtas",
};
