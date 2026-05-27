import type {
  Prisma,
  Product,
  ProductVariant,
  Store,
} from "@/generated/prisma/client";
import { Suspense } from "react";
import { auth } from "@/auth";
import {
  ProductSearchPopupClient,
  type SearchProduct,
} from "@/components/search/ProductSearchPopupClient";
import { ProductSearch } from "@/components/products/ProductSearch";
import { prisma } from "@/lib/prisma";
import {
  buildProductTaxonomyWhere,
  loadProductFilterOptions,
} from "@/lib/product-filters";

type SökPageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    brand?: string;
    country?: string;
    storeId?: string;
  }>;
};

type ProductSearchResult = Product & {
  store: Pick<Store, "id" | "name">;
  variants: ProductVariant[];
};

type SearchMode = "number" | "name" | "url";

type NormalizedSearch = {
  mode: SearchMode;
  term: string;
  wooId: number | undefined;
};

export default async function SökPage({ searchParams }: SökPageProps) {
  const session = await auth();
  const { q, category, brand, country, storeId } = await searchParams;
  const query = (q ?? "").trim();
  const search = normalizeSearch(query);
  const isAdmin = session?.user.role === "ADMIN";

  const storeFilter: Prisma.ProductWhereInput =
    session?.user.role === "PERSONAL" && session.user.storeId
      ? { storeId: session.user.storeId }
      : storeId
        ? { storeId }
        : {};

  const taxonomyFilter = buildProductTaxonomyWhere({
    category: category?.trim(),
    brand: brand?.trim(),
    country: country?.trim(),
  });

  const textFilter = search ? buildProductSearchWhere(search) : {};

  const hasFilters = Boolean(
    query || category || brand || country || storeId,
  );

  const filterStoreId =
    session?.user.role === "PERSONAL"
      ? (session.user.storeId ?? undefined)
      : (storeId ?? undefined);

  const searchToken = [query, category ?? "", brand ?? "", country ?? "", storeId ?? ""]
    .join("|")
    .trim();

  const [products, stores, filterOptions] = await Promise.all([
    hasFilters
      ? prisma.product.findMany({
          where: {
            ...storeFilter,
            ...taxonomyFilter,
            ...textFilter,
          },
          include: {
            store: { select: { id: true, name: true } },
            variants: { orderBy: { name: "asc" } },
          },
          orderBy: { name: "asc" },
          take: 30,
        })
      : Promise.resolve([]),
    isAdmin
      ? prisma.store.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    loadProductFilterOptions(filterStoreId),
  ]);

  return (
    <section className="flex flex-col gap-4">
      <SearchHeader productCount={products.length} query={query} />

      <Suspense>
        <ProductSearch
          basePath="/sok"
          submitOnButtonOnly
          showStoreFilter={isAdmin}
          stores={stores}
          filterOptions={filterOptions}
          initialQuery={query}
          initialStoreId={storeId ?? ""}
          initialCategory={category ?? ""}
          initialBrand={brand ?? ""}
          initialCountry={country ?? ""}
        />
      </Suspense>

      <ProductSearchPopupClient
        products={serializeSearchProducts(products)}
        hasQuery={hasFilters}
        searchToken={searchToken || "_"}
      />
    </section>
  );
}

function SearchHeader({
  productCount,
  query,
}: {
  productCount: number;
  query: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
        Produktsök
      </p>
      <h2 className="mt-1 text-xl font-bold text-zinc-950">Sök produkter</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        Skriv sökord och/eller välj filter, tryck sedan Sök för att visa
        produkter.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <SummaryBox label="Träffar" value={String(productCount)} />
        <SummaryBox
          label="Sökning"
          value={query || "Välj filter eller sök"}
        />
      </div>
    </div>
  );
}

function serializeSearchProducts(
  products: ProductSearchResult[],
): SearchProduct[] {
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    productType: product.productType as SearchProduct["productType"],
    storeName: product.store.name,
    category: product.category,
    brand: product.brand,
    country: product.country,
    slug: product.slug,
    permalink: product.permalink,
    price: Number(product.price),
    ean: product.ean,
    imageUrl: product.imageUrl,
    metaDescription: product.metaDescription,
    stockQuantity: product.stockQuantity,
    stockLocation: product.stockLocation,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      price: Number(variant.price),
      ean: variant.ean,
      imageUrl: variant.imageUrl,
      metaDescription: variant.metaDescription,
      stockQuantity: variant.stockQuantity,
      stockLocation: variant.stockLocation,
    })),
  }));
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-zinc-50 px-3 py-2">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-0.5 truncate text-lg font-semibold text-zinc-900">
        {value}
      </p>
    </div>
  );
}

function normalizeSearch(query: string): NormalizedSearch | null {
  const rawQuery = query.trim();

  if (rawQuery.length === 0) {
    return null;
  }

  if (/^https?:\/\//i.test(rawQuery)) {
    const slug = extractSlugFromUrl(rawQuery);

    return {
      mode: "url",
      term: slug || rawQuery,
      wooId: undefined,
    };
  }

  const isNumberSearch = /^\d+$/.test(rawQuery);

  return {
    mode: isNumberSearch ? "number" : "name",
    term: rawQuery,
    wooId: Number.isSafeInteger(Number(rawQuery)) ? Number(rawQuery) : undefined,
  };
}

function buildProductSearchWhere(
  search: NormalizedSearch,
): Prisma.ProductWhereInput {
  if (search.mode === "number") {
    return {
      OR: [
        { ean: search.term },
        ...(search.wooId ? [{ wooProductId: search.wooId }] : []),
        { variants: { some: { ean: search.term } } },
        ...(search.wooId
          ? [{ variants: { some: { wooVariantId: search.wooId } } }]
          : []),
      ],
    };
  }

  if (search.mode === "url") {
    return {
      OR: [{ slug: search.term }, { permalink: { contains: search.term } }],
    };
  }

  return {
    OR: [
      { name: { contains: search.term } },
      { variants: { some: { name: { contains: search.term } } } },
    ],
  };
}

function extractSlugFromUrl(value: string): string {
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts.at(-1) ?? "";
  } catch {
    return "";
  }
}
