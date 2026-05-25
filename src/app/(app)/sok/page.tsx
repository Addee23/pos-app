import type { Product, ProductVariant, Store } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type SökPageProps = {
  searchParams: Promise<{ q?: string }>;
};

type ProductSearchResult = Product & {
  store: Pick<Store, "id" | "name">;
  variants: ProductVariant[];
};

export default async function SökPage({ searchParams }: SökPageProps) {
  const session = await auth();
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const slugFromQrUrl = extractSlugFromUrl(query);

  // Personal ska bara se sin egen butik. Admin kan söka i alla butiker.
  const storeFilter =
    session?.user.role === "PERSONAL" && session.user.storeId
      ? { storeId: session.user.storeId }
      : {};

  // Om användaren klistrar in en Woo/QR-URL söker vi både på hela texten och sluggen.
  const searchTerms = [query, slugFromQrUrl].filter(Boolean);

  const products = await prisma.product.findMany({
    where: {
      ...storeFilter,
      ...(searchTerms.length > 0
        ? {
            OR: searchTerms.flatMap((term) => [
              { name: { contains: term } },
              { ean: { contains: term } },
              { slug: { contains: term } },
              { permalink: { contains: term } },
              { variants: { some: { name: { contains: term } } } },
              { variants: { some: { ean: { contains: term } } } },
            ]),
          }
        : {}),
    },
    include: {
      store: { select: { id: true, name: true } },
      variants: { orderBy: { name: "asc" } },
    },
    orderBy: { name: "asc" },
    take: 30,
  });

  return (
    <section className="flex flex-col gap-4">
      <SearchHeader productCount={products.length} query={query} />
      <SearchForm query={query} />
      <SearchResultList products={products} hasQuery={query.length > 0} />
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

function SearchResultList({
  products,
  hasQuery,
}: {
  products: ProductSearchResult[];
  hasQuery: boolean;
}) {
  if (products.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
        Inga produkter hittades. Prova namn, EAN, slug eller QR-länk.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!hasQuery ? (
        <p className="px-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
          Visar de första produkterna tills du söker
        </p>
      ) : null}

      {products.map((product) => (
        <ProductResultCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function ProductResultCard({ product }: { product: ProductSearchResult }) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-zinc-900">
            {product.name}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">{product.store.name}</p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
          {product.productType === "VARIABLE" ? "Variabel" : "Enkel"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <InfoBox label="Pris" value={`${formatPrice(product.price)} kr`} />
        <InfoBox label="Lager" value={String(product.stockQuantity)} />
        <InfoBox label="EAN" value={product.ean ?? "-"} />
        <InfoBox label="Plats" value={product.stockLocation ?? "-"} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
        <Chip label={`Slug ${product.slug}`} />
        {product.permalink ? <Chip label="Woo-länk finns" /> : null}
      </div>

      {product.variants.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Varianter
          </p>
          {product.variants.map((variant) => (
            <VariantRow key={variant.id} variant={variant} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function VariantRow({ variant }: { variant: ProductVariant }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-zinc-900">{variant.name}</p>
        <p className="shrink-0 font-semibold text-zinc-900">
          {formatPrice(variant.price)} kr
        </p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-600">
        <p>EAN: {variant.ean ?? "-"}</p>
        <p>Lager: {variant.stockQuantity}</p>
        <p className="col-span-2">Plats: {variant.stockLocation ?? "-"}</p>
      </div>
    </div>
  );
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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-zinc-50 px-3 py-2">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-0.5 break-words font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="max-w-full truncate rounded-full bg-zinc-50 px-2 py-1">
      {label}
    </span>
  );
}

function formatPrice(value: Product["price"] | ProductVariant["price"]): string {
  return Number(value).toFixed(2);
}

function extractSlugFromUrl(value: string): string {
  if (!value.startsWith("http")) {
    return "";
  }

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
