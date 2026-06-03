import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  buildStoredMetaPreviewRows,
  collectAvailableMetaKeys,
} from "../src/lib/woo-meta-preview";

const databaseUrl = process.env.DATABASE_URL!;
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
  const store = await prisma.store.findUnique({
    where: { slug: "demo-butik" },
    select: { id: true, name: true },
  });

  if (!store) {
    throw new Error("demo-butik saknas");
  }

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    select: {
      name: true,
      metaDescription: true,
      shortDescription: true,
      wooMetadata: true,
    },
  });

  console.log("store:", store.name, "products:", products.length);
  console.log("availableFields:", collectAvailableMetaKeys(products));
  console.log(
    "land rows:",
    buildStoredMetaPreviewRows(products, "land").map((r) => r.label),
  );
}

void main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
