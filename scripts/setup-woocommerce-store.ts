/**
 * Sparar WooCommerce-uppgifter från .env till butiken i databasen.
 * Nycklarna ska INTE ligga i källkod — bara i .env (gitignore).
 *
 * 1. Fyll i WOO_URL, WOO_CONSUMER_KEY, WOO_CONSUMER_SECRET i .env
 * 2. npm run setup:woo
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { encryptSecret } from "../src/lib/secret-crypto";

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL saknas i .env");
  }

  const url = new URL(databaseUrl);
  return new PrismaClient({
    adapter: new PrismaMariaDb({
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
    }),
  });
}

async function main() {
  const storeSlug = process.env.IMPORT_STORE_SLUG ?? "demo-butik";
  const wooUrl = process.env.WOO_URL?.trim();
  const consumerKey = process.env.WOO_CONSUMER_KEY?.trim();
  const consumerSecret = process.env.WOO_CONSUMER_SECRET?.trim();
  const webhookSecret = process.env.WOO_WEBHOOK_SECRET?.trim();

  const missing: string[] = [];
  if (!wooUrl) {
    missing.push("WOO_URL");
  }
  if (!consumerKey) {
    missing.push("WOO_CONSUMER_KEY");
  }
  if (!consumerSecret) {
    missing.push("WOO_CONSUMER_SECRET");
  }

  if (missing.length > 0) {
    console.error(
      `Saknas i .env: ${missing.join(", ")}\n\n` +
        "Öppna .env och fyll i värdena från handledaren. Klistra INTE in nycklar i chat eller i .ts-filer.",
    );
    process.exit(1);
  }

  const prisma = createPrismaClient();

  try {
    const store = await prisma.store.findUnique({
      where: { slug: storeSlug },
      select: { id: true, name: true },
    });

    if (!store) {
      console.error(`Butik "${storeSlug}" hittades inte. Kör npm run db:seed`);
      process.exit(1);
    }

    await prisma.store.update({
      where: { id: store.id },
      data: {
        wooUrl: wooUrl!.replace(/\/$/, ""),
        wooConsumerKey: encryptSecret(consumerKey!),
        wooConsumerSecret: encryptSecret(consumerSecret!),
        ...(webhookSecret
          ? { wooWebhookSecret: encryptSecret(webhookSecret) }
          : {}),
      },
    });

    console.log(`WooCommerce sparad för "${store.name}" (${storeSlug}).`);
    console.log(`  URL: ${wooUrl}`);
    console.log(`  Consumer key: ${consumerKey!.slice(0, 8)}…`);
    if (webhookSecret) {
      console.log("  Webhook secret: sparad");
    } else {
      console.log(
        "  Webhook secret: ej satt (lägg WOO_WEBHOOK_SECRET i .env om du skapar webhook i Woo)",
      );
    }
    console.log("\nWebhook-URL för Woo (Order created):");
    console.log(
      `  ${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/webhooks/woocommerce/${store.id}/order-created`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
