import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processWooOrderWebhook } from "@/lib/pickup-from-woo-order";
import { decryptSecret } from "@/lib/secret-crypto";
import {
  canSkipWooWebhookSignature,
  getWooWebhookMode,
} from "@/lib/woo-webhook-config";

type RouteContext = {
  params: Promise<{ storeId: string; event: string }>;
};

const supportedEvents = new Set(["order-created", "order-updated"]);

export async function POST(request: Request, context: RouteContext) {
  const { storeId, event } = await context.params;

  if (!supportedEvents.has(event)) {
    return NextResponse.json({ error: "Webhook-typen stöds inte" }, { status: 404 });
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, name: true, wooWebhookSecret: true },
  });

  if (!store) {
    return NextResponse.json({ error: "Butiken hittades inte" }, { status: 404 });
  }

  const rawBody = await request.text();
  const skipSignature = canSkipWooWebhookSignature();

  if (!skipSignature) {
    if (!store.wooWebhookSecret) {
      return NextResponse.json(
        { error: "Webhook secret saknas för butiken" },
        { status: 400 },
      );
    }

    const signature = request.headers.get("x-wc-webhook-signature");
    const secret = decryptSecret(store.wooWebhookSecret);

    if (!signature || !isValidWooSignature(rawBody, signature, secret)) {
      return NextResponse.json(
        { error: "Ogiltig webhook-signatur" },
        { status: 401 },
      );
    }
  }

  const wooEvent =
    event === "order-created"
      ? ("order-created" as const)
      : ("order-updated" as const);

  try {
    const result = await processWooOrderWebhook(prisma, {
      storeId: store.id,
      event: wooEvent,
      rawBody,
    });

    return NextResponse.json({
      ok: true,
      event,
      mode: getWooWebhookMode(),
      store: store.name,
      result,
    });
  } catch (error) {
    console.error("Woo webhook error:", error);
    return NextResponse.json(
      { error: "Kunde inte hantera order-webhook" },
      { status: 500 },
    );
  }
}

function isValidWooSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}
