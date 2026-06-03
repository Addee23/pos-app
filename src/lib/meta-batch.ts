import type { Prisma } from "@/generated/prisma/client";

export const META_BATCH_GROUP_BY = [
  "name",
  "category",
  "brand",
  "country",
] as const;

export type MetaBatchGroupBy = (typeof META_BATCH_GROUP_BY)[number];

export const META_BATCH_GROUP_LABELS: Record<MetaBatchGroupBy, string> = {
  name: "Produktnamn",
  category: "Kategori",
  brand: "Varumärke",
  country: "Land",
};

/** Visas i UX-kolumnen när admin redigerar per grupp. */
export const META_BATCH_GROUP_TAGS: Record<MetaBatchGroupBy, string> = {
  country: "LAND",
  brand: "VARUMÄRKE",
  category: "KATEGORI",
  name: "PRODUKTNAMN",
};

/** Kort etikett + exempel på vad admin kan skriva i fältet. */
export const META_BATCH_GROUP_CHOICES: Array<{
  groupBy: MetaBatchGroupBy;
  input: string;
  label: string;
}> = [
  { groupBy: "country", input: "land", label: "Land" },
  { groupBy: "brand", input: "varumärke", label: "Varumärke" },
  { groupBy: "category", input: "kategori", label: "Kategori" },
  { groupBy: "name", input: "produktnamn", label: "Produktnamn" },
];

const GROUP_BY_ALIASES: Record<string, MetaBatchGroupBy> = {
  land: "country",
  country: "country",
  countries: "country",
  varumärke: "brand",
  varumarke: "brand",
  brand: "brand",
  brands: "brand",
  marke: "brand",
  märke: "brand",
  kategori: "category",
  category: "category",
  categories: "category",
  produktnamn: "name",
  produkt: "name",
  name: "name",
  names: "name",
};

export function parseMetaBatchGroupByInput(
  value: string,
): MetaBatchGroupBy | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (
    normalized === "name" ||
    normalized === "category" ||
    normalized === "brand" ||
    normalized === "country"
  ) {
    return normalized;
  }

  return GROUP_BY_ALIASES[normalized] ?? null;
}

export type MetaBatchProductRow = {
  id: string;
  name: string;
  shortDescription: string | null;
  metaDescription: string | null;
  category: string | null;
  brand: string | null;
  country: string | null;
};

export type MetaBatchRow = {
  key: string;
  label: string;
  productCount: number;
  metaDescription: string | null;
  shortDescription: string | null;
  mixedMeta: boolean;
  category: string | null;
  brand: string | null;
  country: string | null;
  sampleName: string | null;
};

type ProductMetaSlice = Pick<
  MetaBatchProductRow,
  | "id"
  | "name"
  | "shortDescription"
  | "metaDescription"
  | "category"
  | "brand"
  | "country"
>;

const UNSET_KEY = "";

export function parseMetaBatchGroupBy(
  value: string | null,
): MetaBatchGroupBy {
  const fromInput = value ? parseMetaBatchGroupByInput(value) : null;
  if (fromInput) {
    return fromInput;
  }

  return "country";
}

export function buildMetaBatchRows(
  products: ProductMetaSlice[],
  groupBy: MetaBatchGroupBy,
  productLimit = 10,
): MetaBatchRow[] {
  if (groupBy === "name") {
    return products.slice(0, productLimit).map((product) => ({
      key: product.id,
      label: product.name,
      productCount: 1,
      metaDescription: product.metaDescription,
      shortDescription: product.shortDescription,
      mixedMeta: false,
      category: product.category,
      brand: product.brand,
      country: product.country,
      sampleName: product.name,
    }));
  }

  const groups = new Map<string, ProductMetaSlice[]>();

  for (const product of products) {
    const key = taxonomyKey(product, groupBy);
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(product);
    } else {
      groups.set(key, [product]);
    }
  }

  return [...groups.entries()]
    .map(([key, bucket]) => {
      const sorted = [...bucket].sort((a, b) => a.name.localeCompare(b.name, "sv"));
      const representative = pickRepresentativeMeta(sorted);
      const sample = sorted[0];

      return {
        key,
        label: taxonomyLabel(key, groupBy),
        productCount: sorted.length,
        metaDescription: representative.metaDescription,
        shortDescription: representative.shortDescription,
        mixedMeta: representative.mixedMeta,
        category: groupBy === "category" ? labelToValue(key, groupBy) : sample.category,
        brand: groupBy === "brand" ? labelToValue(key, groupBy) : sample.brand,
        country: groupBy === "country" ? labelToValue(key, groupBy) : sample.country,
        sampleName: sample.name,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "sv"));
}

export function buildMetaBatchProductWhere(
  storeId: string,
  groupBy: MetaBatchGroupBy,
  key: string,
): Prisma.ProductWhereInput {
  if (groupBy === "name") {
    return { storeId, id: key };
  }

  const field = groupBy;
  if (key === UNSET_KEY) {
    return { storeId, [field]: null };
  }

  return { storeId, [field]: key };
}

function taxonomyKey(product: ProductMetaSlice, groupBy: MetaBatchGroupBy): string {
  const value = product[groupBy];
  if (groupBy === "name") {
    return product.id;
  }

  return value?.trim() ? value.trim() : UNSET_KEY;
}

function taxonomyLabel(key: string, groupBy: MetaBatchGroupBy): string {
  if (key !== UNSET_KEY) {
    return key;
  }

  switch (groupBy) {
    case "category":
      return "(saknar kategori)";
    case "brand":
      return "(saknar varumärke)";
    case "country":
      return "(saknar land)";
    default:
      return "(saknar värde)";
  }
}

function labelToValue(key: string, groupBy: MetaBatchGroupBy): string | null {
  if (groupBy === "name" || key === UNSET_KEY) {
    return null;
  }

  return key;
}

function pickRepresentativeMeta(products: ProductMetaSlice[]): {
  metaDescription: string | null;
  shortDescription: string | null;
  mixedMeta: boolean;
} {
  const metaDescriptions = new Set(
    products.map((product) => product.metaDescription ?? ""),
  );
  const shortDescriptions = new Set(
    products.map((product) => product.shortDescription ?? ""),
  );
  const first = products[0];

  return {
    metaDescription: first?.metaDescription ?? null,
    shortDescription: first?.shortDescription ?? null,
    mixedMeta: metaDescriptions.size > 1 || shortDescriptions.size > 1,
  };
}
