/**
 * Exempel: kopplar upphämtning till importerade produkter (bild + info),
 * sätter butiksadress för Google Maps och skickar testmail.
 * Kör: npm run example:pickup-email
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PickupStatus, PrismaClient } from "../src/generated/prisma/client";
import { markPickupAsPacked } from "../src/lib/pickup-notifications";

import { DEFAULT_TEST_PICKUP_ADDRESS } from "../src/lib/constants/pickup";

const EXAMPLE_ADDRESS = DEFAULT_TEST_PICKUP_ADDRESS;
const EXAMPLE_LOGO =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Generic_store_icon.svg/240px-Generic_store_icon.svg.png";
const TEST_EMAIL =
  process.env.TEST_CUSTOMER_EMAIL ?? "adiiinaaaa86@gmail.com";

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

async function main() {
  const prisma = createPrismaClient();

  const store = await prisma.store.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!store) {
    console.log("Ingen butik hittades. Kör: npm run db:seed");
    return;
  }

  await prisma.store.update({
    where: { id: store.id },
    data: {
      address: EXAMPLE_ADDRESS,
      logoUrl: store.logoUrl ?? EXAMPLE_LOGO,
      thankYouMessage:
        store.thankYouMessage ??
        "Tack för ditt köp – vi ses vid upphämtningsdisken!",
    },
  });

  console.log("Butik uppdaterad med adress för Google Maps:", EXAMPLE_ADDRESS);

  const importedProducts = await prisma.product.findMany({
    where: {
      storeId: store.id,
      imageUrl: { not: null },
    },
    orderBy: { name: "asc" },
    take: 2,
    include: {
      variants: {
        where: { imageUrl: { not: null } },
        orderBy: { name: "asc" },
        take: 1,
      },
    },
  });

  if (importedProducts.length === 0) {
    console.log(
      "Inga produkter med bild hittades. Importera först: npm run import:products -- data/woo-products.json",
    );
    return;
  }

  console.log(
    "Använder importerade produkter:",
    importedProducts.map((p) => p.name).join(", "),
  );

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (!admin) {
    throw new Error("Ingen admin hittades. Kör: npm run db:seed");
  }

  const pickup = await prisma.pickup.upsert({
    where: {
      storeId_pickupCode: { storeId: store.id, pickupCode: "EXEMPEL-MAPS" },
    },
    update: {
      customerEmail: TEST_EMAIL,
      status: PickupStatus.AWAITING_PACK,
      readyEmailSentAt: null,
      packedAt: null,
      packedById: null,
      customerName: "Exempel Kund",
    },
    create: {
      storeId: store.id,
      customerName: "Exempel Kund",
      customerEmail: TEST_EMAIL,
      pickupCode: "EXEMPEL-MAPS",
      status: PickupStatus.AWAITING_PACK,
      notes: "Exempelorder – test av bild, produktinfo och karta.",
    },
  });

  await prisma.pickupItem.deleteMany({ where: { pickupId: pickup.id } });

  for (const product of importedProducts) {
    const variant = product.variants[0];
    await prisma.pickupItem.create({
      data: {
        pickupId: pickup.id,
        productId: product.id,
        variantId: variant?.id,
        productName: product.name,
        variantName: variant?.name,
        productSlug: product.slug,
        productImageUrl: variant?.imageUrl ?? product.imageUrl,
        quantity: 1,
      },
    });
  }

  const result = await markPickupAsPacked(pickup.id, admin.id);
  console.log("\nUpphämtningskod: EXEMPEL-MAPS");
  console.log("Mail till:", TEST_EMAIL);
  console.log("Resultat:", result.status, result);

  if (result.status === "packed" && result.readyEmailSentAt) {
    console.log(
      "\nKlart! Öppna inkorgen (och skräppost). Mailet ska visa produktbilder, beskrivning och karta.",
    );
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.log(
        "Tips: Lägg GOOGLE_MAPS_API_KEY i .env för kartbild direkt från Google (annars används förhandsbild + länk till Google Maps).",
      );
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
