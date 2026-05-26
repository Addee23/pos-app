/**
 * Importerar produkter från en lokal WooCommerce-JSON-fil.
 *
 * Kör:
 *   npm run import:products -- data/woo-products.json
 *   npm run import:products -- data/woo-products.json --store=demo-butik
 *   npm run import:products -- data/woo-products.json --update-only
 *
 * Filen kan vara en array [...] eller { "products": [...] }.
 * Butik väljs med --store=<slug> (standard: demo-butik eller IMPORT_STORE_SLUG i .env).
 */
import "dotenv/config";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { importWooProductsForStore } from "../src/lib/product-import";
import { parseProductsFromJsonInput } from "../src/lib/product-woo-json";

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
  let updateOnly = false;

  for (const arg of argv) {
    if (arg === "--update-only") {
      updateOnly = true;
      continue;
    }

    if (arg.startsWith("--store=")) {
      storeSlug = arg.slice("--store=".length).trim();
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Okänt argument: ${arg}`);
    }

    positional.push(arg);
  }

  return { filePath: positional[0], storeSlug, updateOnly };
}

async function main() {
  const { filePath, storeSlug, updateOnly } = parseArgs(process.argv.slice(2));

  if (!filePath) {
    console.error(
      "Ange sökväg till JSON-fil.\n\nExempel:\n  npm run import:products -- data/woo-products.json",
    );
    process.exit(1);
  }

  const absolutePath = resolve(process.cwd(), filePath);
  const rawText = await readFile(absolutePath, "utf8");
  const parsed = JSON.parse(rawText) as unknown;
  const products = parseProductsFromJsonInput(parsed);

  if (!products) {
    console.error(
      "Ogiltig JSON. Använd en array eller { \"products\": [...] }.",
    );
    process.exit(1);
  }

  const prisma = createPrismaClient();

  try {
    const store = await prisma.store.findUnique({
      where: { slug: storeSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        wooUrl: true,
        wooConsumerKey: true,
        wooConsumerSecret: true,
      },
    });

    if (!store) {
      console.error(`Butik med slug "${storeSlug}" hittades inte.`);
      process.exit(1);
    }

    console.log(
      `Importerar ${products.length} produkt(er) till "${store.name}" (${store.slug})…`,
    );
    if (updateOnly) {
      console.log("Läge: uppdatera endast befintliga (--update-only)");
    }

    const result = await importWooProductsForStore(
      prisma,
      store,
      products,
      { updateOnly },
    );

    const skipped =
      updateOnly && result.skippedProducts > 0
        ? ` ${result.skippedProducts} hoppades över (fanns inte i butiken).`
        : "";

    const verb = updateOnly ? "uppdaterades" : "importerades";

    console.log(
      `Klart: ${result.importedProducts} produkter och ${result.importedVariants} varianter ${verb}.${skipped}`,
    );
  } catch (error) {
    console.error("Importen misslyckades:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
