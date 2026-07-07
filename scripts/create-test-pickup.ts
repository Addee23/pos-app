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

  const products = await prisma.product.findMany({
    where: { storeId: store.id, stockQuantity: { gt: 0 } },
    include: { variants: { where: { stockQuantity: { gt: 0 } } } },
    take: 3,
  });

  if (products.length === 0) {
    console.error("Inga produkter i lager hittades.");
    process.exit(1);
  }

  const itemsToCreate = products.map((p) => {
    const variant = p.variants[0] ?? null;
    return {
      productName: p.name,
      variantName: variant?.name ?? null,
      productSlug: p.slug,
      productImageUrl: variant?.imageUrl ?? p.imageUrl,
      quantity: 1,
      productId: p.id,
      variantId: variant?.id ?? null,
    };
  });

  const code = "HAMTA-" + Date.now().toString().slice(-5);

  const pickup = await prisma.pickup.create({
    data: {
      storeId: store.id,
      customerName: "Anna Svensson",
      customerEmail: "anna.svensson@example.com",
      pickupCode: code,
      status: "AWAITING_PACK",
      notes: "Kunden hämtar efter lunch, ring om något saknas.",
      items: { create: itemsToCreate },
    },
  });

  console.log("\n✓ Testorder skapad!");
  console.log("  Kund:     ", pickup.customerName);
  console.log("  Kod:      ", pickup.pickupCode);
  console.log("  Status:   ", pickup.status);
  console.log("  Produkter:", itemsToCreate.map((i) => i.productName).join(", "));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
