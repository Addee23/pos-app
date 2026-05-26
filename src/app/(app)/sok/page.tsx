import type {
  Prisma,
  Product,
  ProductVariant,
  Store,
} from "@/generated/prisma/client";
import { auth } from "@/auth";
import {
  ProductSearchPopupClient,
  type SearchProduct,
} from "@/components/search/ProductSearchPopupClient";
import { prisma } from "@/lib/prisma";

type SökPageProps = {
  searchParams: Promise<{ q?: string }>;
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
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const search = normalizeSearch(query);

  // Personal ska bara se sin egen butik. Admin kan söka i alla butiker.
  const storeFilter: Prisma.ProductWhereInput =
    session?.user.role === "PERSONAL" && session.user.storeId
      ? { storeId: session.user.storeId }
      : {};

  const products =
    search
      ? await prisma.product.findMany({
          where: {
            ...storeFilter,
            ...buildProductSearchWhere(search),
          },
          include: {
            store: { select: { id: true, name: true } },
            variants: { orderBy: { name: "asc" } },
          },
          orderBy: { name: "asc" },
          take: 30,
        })
      : [];

  return (
    <section className="flex flex-col gap-4">
      <SearchHeader productCount={products.length} query={query} />
      <SearchForm query={query} />
      <ProductSearchPopupClient
        products={serializeSearchProducts(products)}
        hasQuery={query.length > 0}
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
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        Produktsök
      </p>
      <h2 className="mt-1 text-xl font-semibold text-zinc-900">
        Sök produkter
      </h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        Sök på namn, EAN, slug eller klistra in en WooCommerce/QR-länk.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <SummaryBox label="Träffar" value={String(productCount)} />
        <SummaryBox label="Sökning" value={query || "Senaste"} />
      </div>
    </div>
  );
}

function SearchForm({ query }: { query: string }) {
  return (
    <form
      action="/sok"
      className="sticky top-[73px] z-30 rounded-lg border border-zinc-200 bg-white/95 p-3 shadow-sm backdrop-blur"
    >
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
        Sök produkt
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Namn, EAN, slug eller QR-länk"
          autoComplete="off"
          className="min-h-12 w-full cursor-text rounded-lg border border-zinc-200 bg-white px-3 text-base font-normal text-zinc-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
        />
      </label>

      <button
        type="submit"
        className="mt-3 min-h-12 w-full cursor-pointer rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm shadow-blue-200 transition hover:bg-blue-600"
      >
        Sök
      </button>
    </form>
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
    <div className="min-w-0 rounded-lg bg-zinc-50 px-3 py-2">
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

  // Samma grundregel som i kassan:
  // - https-länk blir slug-sökning
  // - bara siffror blir exakt nummer/EAN/Woo-ID
  // - annan text blir namnsökning
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

    // En QR-kod kan innehålla t.ex. /produkt/cigarr-premium-no-1.
    // Sista delen i URL:en är då sluggen vi redan lagrar lokalt.
    return parts.at(-1) ?? "";
  } catch {
    return "";
  }
}
