import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  buildGoogleMapsUrl,
  getPickupMapImageUrl,
  getStaticMapImageUrlForAddress,
} from "../src/lib/maps";

const addr = "Drottninggatan 71, 111 36 Stockholm, Sverige";

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL saknas");
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
  const prisma = createPrismaClient();
  const store = await prisma.store.findFirst({
    select: { id: true, name: true, address: true },
  });
  console.log("Store:", store);
  console.log("OSM static:", await getStaticMapImageUrlForAddress(addr));
  console.log("Pickup map:", await getPickupMapImageUrl(addr));
  console.log("Google:", buildGoogleMapsUrl(addr));

  const pickups = await prisma.pickup.findMany({
    take: 3,
    include: {
      items: {
        include: {
          product: { select: { name: true, imageUrl: true, metaDescription: true } },
          variant: { select: { name: true, imageUrl: true, metaDescription: true } },
        },
      },
    },
  });
  for (const p of pickups) {
    console.log("\n", p.pickupCode, "items:", p.items.length);
    for (const i of p.items) {
      console.log({
        productId: i.productId,
        productName: i.productName,
        snapshotImage: i.productImageUrl?.slice(0, 60),
        dbImage: (i.variant?.imageUrl ?? i.product?.imageUrl)?.slice(0, 60),
        meta: (i.variant?.metaDescription ?? i.product?.metaDescription)?.slice(0, 80),
      });
    }
  }
  const urls = [
    "https://staticmap.openstreetmap.de/staticmap.php?center=59.33,18.06&zoom=16&size=560x220&markers=59.33,18.06,red-pushpin",
    "https://staticmap.openstreetmap.fr/staticmap.php?center=59.33,18.06&zoom=16&size=560x220&markers=59.33,18.06,red",
    "https://tile.openstreetmap.org/16/35633/18978.png",
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
      console.log("HTTP", r.status, r.headers.get("content-type"), u.slice(0, 55));
    } catch (e) {
      console.log("FAIL", u.slice(0, 55), e);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
