import { PickupStatus } from "@/generated/prisma/client";
import {
  MailConfigurationError,
  resolveSmtpConfig,
  sendPickupReadyEmail,
} from "@/lib/mail";
import { resolvePickupAddress } from "@/lib/constants/pickup";
import {
  mapPickupItemsToEmailItems,
  pickupEmailItemsInclude,
} from "@/lib/pickup-email-items";
import { syncPickupItemsFromCatalog } from "@/lib/pickup-catalog-sync";
import { prisma } from "@/lib/prisma";

const pickupEmailInclude = {
  store: {
    select: {
      name: true,
      address: true,
      logoUrl: true,
      thankYouMessage: true,
      returnText: true,
      receiptFooter: true,
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      smtpUser: true,
      smtpPass: true,
      smtpFrom: true,
    },
  },
  items: pickupEmailItemsInclude,
};

export type NotifyPickupReadyResult =
  | { status: "sent"; readyEmailSentAt: Date }
  | { status: "skipped"; reason: string }
  | { status: "error"; message: string };

/** Anropas när en order blir redo för upphämtning (status READY). */
export async function autoNotifyPickupReady(
  pickupId: string,
): Promise<NotifyPickupReadyResult> {
  return notifyPickupReady(pickupId);
}

/** Skickar mail för alla redo-order i butiken som ännu inte fått bekräftelse. */
export async function processPendingPickupEmails(
  storeId: string,
): Promise<NotifyPickupReadyResult[]> {
  const pending = await prisma.pickup.findMany({
    where: {
      storeId,
      status: PickupStatus.READY,
      customerEmail: { not: null },
      readyEmailSentAt: null,
    },
    select: { id: true },
  });

  const results: NotifyPickupReadyResult[] = [];
  for (const pickup of pending) {
    results.push(await notifyPickupReady(pickup.id));
  }
  return results;
}

export async function notifyPickupReady(
  pickupId: string,
  options?: { force?: boolean },
): Promise<NotifyPickupReadyResult> {
  const pickup = await prisma.pickup.findUnique({
    where: { id: pickupId },
    include: pickupEmailInclude,
  });

  if (!pickup) {
    return { status: "error", message: "Upphämtningen hittades inte" };
  }

  if (pickup.status !== PickupStatus.READY) {
    return {
      status: "skipped",
      reason: "Ordern är inte redo för upphämtning",
    };
  }

  if (!pickup.customerEmail) {
    return {
      status: "skipped",
      reason: "Kunden saknar e-postadress",
    };
  }

  if (pickup.readyEmailSentAt && !options?.force) {
    return {
      status: "skipped",
      reason: "Bekräftelsemail är redan skickat",
    };
  }

  try {
    await syncPickupItemsFromCatalog(pickup.id);

    const refreshed = await prisma.pickup.findUnique({
      where: { id: pickup.id },
      include: pickupEmailInclude,
    });

    if (!refreshed) {
      return { status: "error", message: "Upphämtningen hittades inte" };
    }

    const smtpConfig = resolveSmtpConfig(refreshed.store);
    const resolvedAddress = resolvePickupAddress(refreshed.store.address);

    if (!refreshed.store.address?.trim()) {
      const pickupStore = await prisma.pickup.findUnique({
        where: { id: refreshed.id },
        select: { storeId: true },
      });
      if (pickupStore) {
        await prisma.store.update({
          where: { id: pickupStore.storeId },
          data: { address: resolvedAddress },
        });
      }
    }

    await sendPickupReadyEmail(
      {
        customerEmail: refreshed.customerEmail,
        customerName: refreshed.customerName,
        pickupCode: refreshed.pickupCode,
        notes: refreshed.notes,
        store: {
          ...refreshed.store,
          address: resolvedAddress,
        },
        items: mapPickupItemsToEmailItems(refreshed.items),
      },
      smtpConfig,
    );

    const readyEmailSentAt = new Date();

    await prisma.pickup.update({
      where: { id: refreshed.id },
      data: { readyEmailSentAt },
    });

    return { status: "sent", readyEmailSentAt };
  } catch (error) {
    if (error instanceof MailConfigurationError) {
      return { status: "error", message: error.message };
    }

    console.error("notifyPickupReady failed", error);
    return {
      status: "error",
      message: "Kunde inte skicka bekräftelsemail",
    };
  }
}
