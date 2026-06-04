import type { PrismaClient } from "@/generated/prisma/client";
import {
  getPickupShippingMethodIds,
  isWooWebhookTestMode,
} from "@/lib/woo-webhook-config";

export type ProcessWooOrderResult =
  | {
      status: "created";
      pickupId: string;
      pickupCode: string;
      itemCount: number;
    }
  | { status: "exists"; pickupId: string; pickupCode: string }
  | { status: "skipped"; reason: string }
  | { status: "ignored"; reason: string };

type WooOrderPayload = Record<string, unknown>;

export async function processWooOrderWebhook(
  prisma: PrismaClient,
  params: {
    storeId: string;
    event: "order-created" | "order-updated";
    rawBody: string;
  },
): Promise<ProcessWooOrderResult> {
  let payload: unknown;

  try {
    payload = JSON.parse(params.rawBody) as unknown;
  } catch {
    return { status: "skipped", reason: "Ogiltig JSON i webhook-body" };
  }

  const order = asObject(payload);
  if (!order) {
    return { status: "skipped", reason: "Orderdata saknas" };
  }

  const wooOrderId = asNumber(order.id);
  if (!wooOrderId) {
    return { status: "skipped", reason: "Order-ID saknas" };
  }

  if (!isPickupOrder(order)) {
    return {
      status: "ignored",
      reason: isWooWebhookTestMode()
        ? "Ordern har inga rader"
        : "Ordern är inte markerad för upphämtning i butik",
    };
  }

  if (!isWooWebhookTestMode() && !isProcessingOrder(order)) {
    return {
      status: "ignored",
      reason: "Ordern har inte status processing i WooCommerce",
    };
  }

  const pickupCode = buildPickupCode(wooOrderId);
  const existing = await prisma.pickup.findUnique({
    where: {
      storeId_pickupCode: { storeId: params.storeId, pickupCode },
    },
    select: { id: true, pickupCode: true },
  });

  if (existing) {
    if (params.event === "order-updated") {
      await updatePickupFromOrder(prisma, existing.id, order);
    }

    return {
      status: "exists",
      pickupId: existing.id,
      pickupCode: existing.pickupCode,
    };
  }

  if (params.event === "order-updated") {
    return {
      status: "skipped",
      reason: "Upphämtning finns inte — väntar på order-created",
    };
  }

  const customer = resolveCustomer(order);
  const lineItems = resolveLineItems(order);

  if (lineItems.length === 0) {
    return { status: "skipped", reason: "Ordern har inga produktrader" };
  }

  const pickupItems = await resolvePickupItems(prisma, params.storeId, lineItems);

  const pickup = await prisma.pickup.create({
    data: {
      storeId: params.storeId,
      customerName: customer.name,
      customerEmail: customer.email,
      pickupCode,
      status: "AWAITING_PACK",
      notes: buildOrderNotes(order),
      items: { create: pickupItems },
    },
    select: { id: true, pickupCode: true },
  });

  return {
    status: "created",
    pickupId: pickup.id,
    pickupCode: pickup.pickupCode,
    itemCount: pickupItems.length,
  };
}

function isProcessingOrder(order: WooOrderPayload): boolean {
  const status = asString(order.status)?.toLowerCase();
  return status === "processing";
}

function isPickupOrder(order: WooOrderPayload): boolean {
  const lineItems = resolveLineItems(order);
  if (lineItems.length === 0) {
    return false;
  }

  if (isWooWebhookTestMode()) {
    return true;
  }

  const allowedMethods = getPickupShippingMethodIds();
  const shippingLines = asArray(order.shipping_lines);

  if (shippingLines.length === 0) {
    return false;
  }

  return shippingLines.some((line) => {
    const shipping = asObject(line);
    if (!shipping) {
      return false;
    }

    const methodId = asString(shipping.method_id)?.toLowerCase() ?? "";
    return allowedMethods.includes(methodId);
  });
}

function buildPickupCode(wooOrderId: number): string {
  return `WC-${wooOrderId}`;
}

function buildOrderNotes(order: WooOrderPayload): string | null {
  const number = asString(order.number) ?? String(order.id ?? "");
  const status = asString(order.status) ?? "unknown";
  const mode = isWooWebhookTestMode() ? "test" : "woo";

  return `Woo order #${number} (${status}, ${mode})`;
}

function resolveCustomer(order: WooOrderPayload): {
  name: string;
  email: string | null;
} {
  const billing = asObject(order.billing);
  const shipping = asObject(order.shipping);

  const firstName =
    asString(billing?.first_name) ?? asString(shipping?.first_name) ?? "";
  const lastName =
    asString(billing?.last_name) ?? asString(shipping?.last_name) ?? "";
  const email = asString(billing?.email) ?? asString(shipping?.email) ?? null;

  const name = `${firstName} ${lastName}`.trim() || "Woo-kund";

  return { name, email };
}

type ResolvedLineItem = {
  wooProductId: number;
  wooVariantId: number | null;
  name: string;
  quantity: number;
};

function resolveLineItems(order: WooOrderPayload): ResolvedLineItem[] {
  const rows = asArray(order.line_items);
  const items: ResolvedLineItem[] = [];

  for (const row of rows) {
    const line = asObject(row);
    if (!line) {
      continue;
    }

    const wooProductId = asNumber(line.product_id);
    if (!wooProductId) {
      continue;
    }

    const rawVariantId = asNumber(line.variation_id);
    const wooVariantId =
      rawVariantId && rawVariantId > 0 ? rawVariantId : null;

    items.push({
      wooProductId,
      wooVariantId,
      name: asString(line.name) ?? `Produkt ${wooProductId}`,
      quantity: Math.max(1, asNumber(line.quantity) ?? 1),
    });
  }

  return items;
}

async function resolvePickupItems(
  prisma: PrismaClient,
  storeId: string,
  lineItems: ResolvedLineItem[],
) {
  const rows: Array<{
    productId: string | null;
    variantId: string | null;
    productName: string;
    variantName: string | null;
    productSlug: string | null;
    productImageUrl: string | null;
    quantity: number;
  }> = [];

  for (const line of lineItems) {
    const product = await prisma.product.findUnique({
      where: {
        storeId_wooProductId: {
          storeId,
          wooProductId: line.wooProductId,
        },
      },
      include: { variants: true },
    });

    let variantId: string | null = null;
    let variantName: string | null = null;

    if (product && line.wooVariantId) {
      const variant = product.variants.find(
        (row) => row.wooVariantId === line.wooVariantId,
      );
      variantId = variant?.id ?? null;
      variantName = variant?.name ?? null;
    }

    rows.push({
      productId: product?.id ?? null,
      variantId,
      productName: product?.name ?? line.name,
      variantName,
      productSlug: product?.slug ?? null,
      productImageUrl: product?.imageUrl ?? null,
      quantity: line.quantity,
    });
  }

  return rows;
}

async function updatePickupFromOrder(
  prisma: PrismaClient,
  pickupId: string,
  order: WooOrderPayload,
) {
  const customer = resolveCustomer(order);

  await prisma.pickup.update({
    where: { id: pickupId },
    data: {
      customerName: customer.name,
      customerEmail: customer.email,
      notes: buildOrderNotes(order),
    },
  });
}

function asObject(value: unknown): WooOrderPayload | null {
  return typeof value === "object" && value !== null
    ? (value as WooOrderPayload)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}
