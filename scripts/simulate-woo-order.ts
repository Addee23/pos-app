/**
 * Simulerar WooCommerce order-created utan riktig webbshop.
 * Kräver WOOCOMMERCE_WEBHOOK_MODE=test i .env (standard i .env.example).
 *
 * Kör:
 *   npm run simulate:woo-order
 *   npm run simulate:woo-order -- data/woo-order.example.json
 *   npm run simulate:woo-order -- data/woo-order.example.json --order-id=5002
 */
import "dotenv/config";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { processWooOrderWebhook } from "../src/lib/pickup-from-woo-order";
import { getWooWebhookMode, isWooWebhookTestMode } from "../src/lib/woo-webhook-config";

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL saknas i .env");
  }

  const url = new URL(databaseUrl);
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  });

  return new PrismaClient({ adapter });
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let storeSlug = process.env.IMPORT_STORE_SLUG ?? "demo-butik";
  let orderId: number | null = null;

  for (const arg of argv) {
    if (arg.startsWith("--store=")) {
      storeSlug = arg.slice("--store=".length).trim();
      continue;
    }

    if (arg.startsWith("--order-id=")) {
      orderId = Number(arg.slice("--order-id=".length));
      continue;
    }

    if (!arg.startsWith("-")) {
      positional.push(arg);
    }
  }

  return { filePath: positional[0] ?? "data/woo-order.example.json", storeSlug, orderId };
}

async function main() {
  if (!isWooWebhookTestMode()) {
    console.error(
      "Sätt WOOCOMMERCE_WEBHOOK_MODE=test i .env för att simulera ordrar lokalt.",
    );
    process.exit(1);
  }

  const { filePath, storeSlug, orderId } = parseArgs(process.argv.slice(2));
  const absolutePath = resolve(process.cwd(), filePath);
  const rawText = await readFile(absolutePath, "utf8");
  const order = JSON.parse(rawText) as Record<string, unknown>;

  if (orderId && Number.isFinite(orderId)) {
    order.id = orderId;
    order.number = String(orderId);
  }

  const prisma = createPrismaClient();

  try {
    const store = await prisma.store.findUnique({
      where: { slug: storeSlug },
      select: { id: true, name: true },
    });

    if (!store) {
      console.error(`Butik "${storeSlug}" hittades inte.`);
      process.exit(1);
    }

    console.log(
      `Simulerar Woo-order (${getWooWebhookMode()}) → "${store.name}"…`,
    );

    const result = await processWooOrderWebhook(prisma, {
      storeId: store.id,
      event: "order-created",
      rawBody: JSON.stringify(order),
    });

    console.log(JSON.stringify(result, null, 2));

    if (result.status === "created") {
      console.log(
        `\nÖppna Upphämtning och sök på kod: ${result.pickupCode}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
