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
  type PickupItemForEmail,
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
} as const;

export type NotifyPickupReadyResult =
  | { status: "sent"; readyEmailSentAt: Date }
  | { status: "skipped"; reason: string }
  | { status: "error"; message: string };

export type MarkPickupPackedResult =
  | { status: "packed"; readyEmailSentAt: Date | null }
  | { status: "skipped"; reason: string }
  | { status: "error"; message: string };

/** Personal markerar order som packad → mejl skickas → status blir READY. */
export async function markPickupAsPacked(
  pickupId: string,
  packedById: string,
): Promise<MarkPickupPackedResult> {
  const pickup = await prisma.pickup.findUnique({
    where: { id: pickupId },
    include: pickupEmailInclude,
  });

  if (!pickup) {
    return { status: "error", message: "Upphämtningen hittades inte" };
  }

  if (pickup.status !== PickupStatus.AWAITING_PACK) {
    return {
      status: "skipped",
      reason: "Ordern väntar inte på packning",
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

    let readyEmailSentAt: Date | null = null;

    if (refreshed.customerEmail) {
      const emailResult = await sendPickupReadyEmailForPickup(refreshed);
      if (emailResult.status === "error") {
        return emailResult;
      }
      readyEmailSentAt = emailResult.readyEmailSentAt;
    }

    const packedAt = new Date();

    await prisma.pickup.update({
      where: { id: refreshed.id },
      data: {
        status: PickupStatus.READY,
        packedAt,
        packedById,
        readyEmailSentAt,
      },
    });

    return { status: "packed", readyEmailSentAt };
  } catch (error) {
    if (error instanceof MailConfigurationError) {
      return { status: "error", message: error.message };
    }

    console.error("markPickupAsPacked failed", error);
    return {
      status: "error",
      message: "Kunde inte markera ordern som packad",
    };
  }
}

/** Skickar om bekräftelsemail för redan packade order (READY). */
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
    const emailResult = await sendPickupReadyEmailForPickup(pickup);

    if (emailResult.status === "error") {
      return emailResult;
    }

    await prisma.pickup.update({
      where: { id: pickup.id },
      data: { readyEmailSentAt: emailResult.readyEmailSentAt },
    });

    return emailResult;
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

async function sendPickupReadyEmailForPickup(
  pickup: {
    id: string;
    customerEmail: string | null;
    customerName: string;
    pickupCode: string;
    notes: string | null;
    store: {
      name: string;
      address: string | null;
      logoUrl: string | null;
      thankYouMessage: string | null;
      returnText: string | null;
      receiptFooter: string | null;
      smtpHost: string | null;
      smtpPort: number | null;
      smtpSecure: boolean;
      smtpUser: string | null;
      smtpPass: string | null;
      smtpFrom: string | null;
    };
    items: PickupItemForEmail[];
  },
): Promise<{ status: "sent"; readyEmailSentAt: Date } | { status: "error"; message: string }> {
  if (!pickup.customerEmail) {
    return { status: "error", message: "Kunden saknar e-postadress" };
  }

  const smtpConfig = resolveSmtpConfig(pickup.store);
  const resolvedAddress = resolvePickupAddress(pickup.store.address);

  if (!pickup.store.address?.trim()) {
    const pickupStore = await prisma.pickup.findUnique({
      where: { id: pickup.id },
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
      customerEmail: pickup.customerEmail,
      customerName: pickup.customerName,
      pickupCode: pickup.pickupCode,
      notes: pickup.notes,
      store: {
        ...pickup.store,
        address: resolvedAddress,
      },
      items: mapPickupItemsToEmailItems(pickup.items),
    },
    smtpConfig,
  );

  return { status: "sent", readyEmailSentAt: new Date() };
}
