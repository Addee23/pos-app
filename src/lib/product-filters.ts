import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type ProductFilterOptions = {
  categories: string[];
  brands: string[];
  countries: string[];
};

export async function loadProductFilterOptions(
  storeId?: string,
): Promise<ProductFilterOptions> {
  const where: Prisma.ProductWhereInput = storeId ? { storeId } : {};

  const [categories, brands, countries] = await Promise.all([
    distinctCategories(where),
    distinctBrands(where),
    distinctCountries(where),
  ]);

  return { categories, brands, countries };
}

async function distinctCategories(
  where: Prisma.ProductWhereInput,
): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { ...where, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  return rows
    .map((row) => row.category)
    .filter((value): value is string => Boolean(value));
}

async function distinctBrands(where: Prisma.ProductWhereInput): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { ...where, brand: { not: null } },
    select: { brand: true },
    distinct: ["brand"],
    orderBy: { brand: "asc" },
  });

  return rows
    .map((row) => row.brand)
    .filter((value): value is string => Boolean(value));
}

async function distinctCountries(
  where: Prisma.ProductWhereInput,
): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { ...where, country: { not: null } },
    select: { country: true },
    distinct: ["country"],
    orderBy: { country: "asc" },
  });

  return rows
    .map((row) => row.country)
    .filter((value): value is string => Boolean(value));
}

export function buildProductTaxonomyWhere(params: {
  category?: string;
  brand?: string;
  country?: string;
}): Prisma.ProductWhereInput {
  return {
    ...(params.category ? { category: params.category } : {}),
    ...(params.brand ? { brand: params.brand } : {}),
    ...(params.country ? { country: params.country } : {}),
  };
}
