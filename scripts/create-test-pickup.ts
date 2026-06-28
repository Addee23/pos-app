import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const url = new URL(process.env.DATABASE_URL!);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: url.port ? Number(url.port) : 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ""),
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const store = await prisma.store.findFirst();
  if (!store) {
    console.error("Ingen butik hittades i databasen.");
    process.exit(1);
  }

  const product = await prisma.product.findFirst({
    where: { storeId: store.id },
    include: { variants: true },
  });

  const pickup = await prisma.pickup.create({
    data: {
      storeId: store.id,
      customerName: "Test Kund",
      customerEmail: "test@example.com",
      pickupCode: "HAMTA-TEST-" + Date.now().toString().slice(-4),
      status: "AWAITING_PACK",
      items: product
        ? {
            create: [
              {
                productName: product.name,
                variantName: product.variants[0]?.name ?? null,
                productSlug: product.slug,
                productImageUrl: product.variants[0]?.imageUrl ?? product.imageUrl,
                quantity: 1,
                productId: product.id,
                variantId: product.variants[0]?.id ?? null,
              },
            ],
          }
        : undefined,
    },
  });

  console.log("Testorder skapad:", pickup.id, pickup.pickupCode, pickup.status);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
