/**
 * Fyller i kategori/varumärke/land på befintliga produkter.
 * Kör: npm run backfill:product-taxonomy
 */
import "dotenv/config";
import { inferProductTaxonomy, countryFromBrand } from "../src/lib/product-taxonomy-options";
import { prisma } from "../src/lib/prisma";

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      shortDescription: true,
      category: true,
      brand: true,
      country: true,
    },
  });

  let updated = 0;

  for (const product of products) {
    const inferred = inferProductTaxonomy({
      name: product.name,
      shortDescription: product.shortDescription,
      brand: product.brand,
    });

    const data: {
      category?: string;
      brand?: string;
      country?: string;
    } = {};

    if (!product.category && inferred.category) {
      data.category = inferred.category;
    }

    const nextBrand = product.brand ?? inferred.brand;
    const nextCountry = inferred.country ?? countryFromBrand(nextBrand);

    if (!product.brand && inferred.brand) {
      data.brand = inferred.brand;
    }
    if (!product.country && nextCountry) {
      data.country = nextCountry;
    }

    if (Object.keys(data).length === 0) {
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data,
    });
    updated += 1;
  }

  console.log(`Uppdaterade ${updated} av ${products.length} produkter.`);
}

void main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
