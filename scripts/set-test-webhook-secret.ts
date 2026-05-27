import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { encryptSecret } from "../src/lib/secret-crypto";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL saknas");
}

const url = new URL(databaseUrl);
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  }),
});

async function main() {
  const secret = process.env.WOO_WEBHOOK_TEST_SECRET ?? "test-webhook-secret";

  await prisma.store.update({
    where: { slug: "demo-butik" },
    data: { wooWebhookSecret: encryptSecret(secret) },
  });

  console.log("Webhook secret sparad för demo-butik.");
}

void main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
