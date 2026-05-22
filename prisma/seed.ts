import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import {
  PickupStatus,
  PrismaClient,
  ProductType,
} from "../src/generated/prisma/client";

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

const prisma = createPrismaClient();

async function main() {
  const store = await prisma.store.upsert({
    where: { slug: "demo-butik" },
    update: {},
    create: {
      name: "Demo Butik",
      slug: "demo-butik",
    },
  });

  const adminPassword = await hash("admin123", 12);
  const personalPassword = await hash("personal123", 12);

  await prisma.user.upsert({
    where: { email: "admin@butik.se" },
    update: {},
    create: {
      email: "admin@butik.se",
      name: "Admin Användare",
      passwordHash: adminPassword,
      role: "ADMIN",
      storeId: store.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "personal@butik.se" },
    update: {},
    create: {
      email: "personal@butik.se",
      name: "Personal Användare",
      passwordHash: personalPassword,
      role: "PERSONAL",
      storeId: store.id,
    },
  });

  const simpleProduct = await prisma.product.upsert({
    where: {
      storeId_wooProductId: { storeId: store.id, wooProductId: 1001 },
    },
    update: {},
    create: {
      storeId: store.id,
      wooProductId: 1001,
      name: "Cigarr Premium No.1",
      slug: "cigarr-premium-no-1",
      permalink: "https://example.com/produkt/cigarr-premium-no-1",
      productType: ProductType.SIMPLE,
      price: 149.0,
      ean: "7310861234567",
      stockQuantity: 24,
      stockLocation: "Hylla A1",
    },
  });

  const variableProduct = await prisma.product.upsert({
    where: {
      storeId_wooProductId: { storeId: store.id, wooProductId: 1002 },
    },
    update: {},
    create: {
      storeId: store.id,
      wooProductId: 1002,
      name: "Tobak Blandning",
      slug: "tobak-blandning",
      permalink: "https://example.com/produkt/tobak-blandning",
      productType: ProductType.VARIABLE,
      price: 89.0,
      ean: null,
      stockQuantity: 0,
      stockLocation: null,
    },
  });

  await prisma.productVariant.upsert({
    where: {
      productId_wooVariantId: {
        productId: variableProduct.id,
        wooVariantId: 2001,
      },
    },
    update: {},
    create: {
      productId: variableProduct.id,
      wooVariantId: 2001,
      name: "50g",
      price: 89.0,
      ean: "7310861234574",
      stockQuantity: 12,
      stockLocation: "Hylla B2",
    },
  });

  await prisma.productVariant.upsert({
    where: {
      productId_wooVariantId: {
        productId: variableProduct.id,
        wooVariantId: 2002,
      },
    },
    update: {},
    create: {
      productId: variableProduct.id,
      wooVariantId: 2002,
      name: "100g",
      price: 159.0,
      ean: "7310861234581",
      stockQuantity: 8,
      stockLocation: "Hylla B3",
    },
  });

  await prisma.pickup.upsert({
    where: {
      storeId_pickupCode: { storeId: store.id, pickupCode: "HAMTA-1001" },
    },
    update: {},
    create: {
      storeId: store.id,
      customerName: "Sara Kund",
      pickupCode: "HAMTA-1001",
      status: PickupStatus.READY,
      notes: "Kontrollera legitimation vid utlämning.",
    },
  });

  await prisma.pickup.upsert({
    where: {
      storeId_pickupCode: { storeId: store.id, pickupCode: "HAMTA-1002" },
    },
    update: {},
    create: {
      storeId: store.id,
      customerName: "Ali Kund",
      pickupCode: "HAMTA-1002",
      status: PickupStatus.READY,
      notes: "Betald online.",
    },
  });

  console.log("Seed klar!");
  console.log("- Butik:", store.name);
  console.log("- Enkel produkt:", simpleProduct.name);
  console.log("- Variabel produkt:", variableProduct.name);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
