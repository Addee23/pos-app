/**
 * Skickar signerad order-webhook till körande dev-server (som WooCommerce).
 *
 * 1. Spara samma secret i Inställningar som WOO_WEBHOOK_TEST_SECRET
 * 2. npm run dev
 * 3. npm run test:woo-webhook -- --order-id=5010
 */
import "dotenv/config";
import { createHmac } from "crypto";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const storeSlug = process.env.IMPORT_STORE_SLUG ?? "demo-butik";
const secret = process.env.WOO_WEBHOOK_TEST_SECRET ?? "test-webhook-secret";

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL saknas");
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

async function main() {
  const filePath = process.argv[2]?.startsWith("--")
    ? "data/woo-order.example.json"
    : (process.argv[2] ?? "data/woo-order.example.json");

  const orderIdArg = process.argv.find((arg) => arg.startsWith("--order-id="));
  const parsedOrderId = orderIdArg
    ? Number(orderIdArg.slice("--order-id=".length))
    : Date.now() % 1_000_000;

  const rawText = await readFile(resolve(process.cwd(), filePath), "utf8");
  const order = JSON.parse(rawText) as Record<string, unknown>;
  order.id = parsedOrderId;
  order.number = String(parsedOrderId);

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

    const body = JSON.stringify(order);
    const signature = createHmac("sha256", secret).update(body).digest("base64");
    const url = `${baseUrl}/api/webhooks/woocommerce/${store.id}/order-created`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-wc-webhook-signature": signature,
      },
      body,
    });

    const data = await response.json();
    console.log(`${store.name}:`, response.status, JSON.stringify(data, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

void main();
