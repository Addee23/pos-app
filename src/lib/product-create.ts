import type { PrismaClient } from "@/generated/prisma/client";
import { slugifyProductName } from "@/lib/product-slug";

/** Lokala produkter (ej från Woo) får negativa wooProductId. */
export async function allocateLocalWooProductId(
  prisma: PrismaClient,
  storeId: string,
): Promise<number> {
  const agg = await prisma.product.aggregate({
    where: { storeId, wooProductId: { lt: 0 } },
    _min: { wooProductId: true },
  });

  const min = agg._min.wooProductId;
  return min === null ? -1 : min - 1;
}

export async function uniqueProductSlugForStore(
  prisma: PrismaClient,
  storeId: string,
  name: string,
): Promise<string> {
  const base = slugifyProductName(name);
  let candidate = base;
  let suffix = 2;

  while (
    await prisma.product.findFirst({
      where: { storeId, slug: candidate },
      select: { id: true },
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
