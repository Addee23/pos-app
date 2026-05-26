import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AdminDashboardLink } from "@/components/layout/AdminDashboardLink";
import { ProductList } from "@/components/products/ProductList";
import { ProductSearch } from "@/components/products/ProductSearch";
import { ProductUpdateTools } from "@/components/products/ProductUpdateTools";
import {
  buildProductTaxonomyWhere,
  loadProductFilterOptions,
} from "@/lib/product-filters";

const PRODUCTS_PER_PAGE = 10;

type ProductsPageProps = {
  searchParams: Promise<{
    q?: string;
    storeId?: string;
    page?: string;
    category?: string;
    brand?: string;
    country?: string;
  }>;
};

export default async function AdminProductsPage({
  searchParams,
}: ProductsPageProps) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/kassa");
  }

  const defaultStoreId = session.user.storeId ?? "";

  const { q: rawQuery, storeId, page: rawPage, category, brand, country } =
    await searchParams;
  const q = (rawQuery ?? "").trim();
  const requestedPage = parsePage(rawPage);
  const where: Prisma.ProductWhereInput = {
    ...(storeId ? { storeId } : {}),
    ...buildProductTaxonomyWhere({
      category: category?.trim(),
      brand: brand?.trim(),
      country: country?.trim(),
    }),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { ean: { contains: q } },
            { slug: { contains: q } },
          ],
        }
      : {}),
  };

  const [stores, totalProducts, filterOptions] = await Promise.all([
    prisma.store.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.count({ where }),
    loadProductFilterOptions(storeId),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalProducts / PRODUCTS_PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);
  const products = await prisma.product.findMany({
    where,
    include: {
      store: { select: { id: true, name: true } },
      variants: { orderBy: { name: "asc" } },
    },
    orderBy: { name: "asc" },
    skip: (currentPage - 1) * PRODUCTS_PER_PAGE,
    take: PRODUCTS_PER_PAGE,
  });

  return (
    <section className="flex flex-col gap-4">
      <AdminDashboardLink />
      <ProductsHeader productCount={totalProducts} storeCount={stores.length} />
      <Suspense>
        <ProductSearch
          stores={stores}
          filterOptions={filterOptions}
          initialQuery={q}
          initialStoreId={storeId ?? ""}
          initialCategory={category ?? ""}
          initialBrand={brand ?? ""}
          initialCountry={country ?? ""}
        />
      </Suspense>
      <ProductUpdateTools
        stores={stores}
        defaultStoreId={storeId ?? defaultStoreId}
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          wooProductId: product.wooProductId,
          storeId: product.storeId,
          storeName: product.store.name,
        }))}
      />
      <ProductList products={products} />
      <ProductPagination
        currentPage={currentPage}
        pageSize={PRODUCTS_PER_PAGE}
        q={q}
        storeId={storeId ?? ""}
        category={category ?? ""}
        brand={brand ?? ""}
        country={country ?? ""}
        totalProducts={totalProducts}
        totalPages={totalPages}
      />
    </section>
  );
}

function ProductsHeader({
  productCount,
  storeCount,
}: {
  productCount: number;
  storeCount: number;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Admin
          </p>
          <h2 className="mt-1 text-xl font-semibold text-zinc-900">Produkter</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Hantera sortiment, lager och priser.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-accent px-4 text-sm font-bold text-accent-foreground shadow-sm transition hover:bg-blue-600"
        >
          + Lägg till produkt
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <SummaryBox label="Totalt produkter" value={String(productCount)} />
        <SummaryBox label="Butiker" value={String(storeCount)} />
      </div>
    </div>
  );
}

function ProductPagination({
  currentPage,
  pageSize,
  q,
  storeId,
  category,
  brand,
  country,
  totalProducts,
  totalPages,
}: {
  currentPage: number;
  pageSize: number;
  q: string;
  storeId: string;
  category: string;
  brand: string;
  country: string;
  totalProducts: number;
  totalPages: number;
}) {
  const firstVisible = totalProducts === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastVisible = Math.min(currentPage * pageSize, totalProducts);
  const previousPage = currentPage - 1;
  const nextPage = currentPage + 1;

  return (
    <nav
      aria-label="Produktpagination"
      className="rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm"
    >
      <p className="text-center text-xs font-semibold text-zinc-500">
        Visar {firstVisible}-{lastVisible} av {totalProducts} produkter
      </p>
      <p className="mt-1 text-center text-xs text-zinc-400">
        Sida {currentPage} av {totalPages}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {currentPage > 1 ? (
          <Link
            href={productPageHref({
              page: previousPage,
              q,
              storeId,
              category,
              brand,
              country,
            })}
            className="min-h-11 rounded-2xl border border-zinc-200 px-4 py-3 text-center text-sm font-bold text-zinc-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            Föregående
          </Link>
        ) : (
          <span className="min-h-11 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-center text-sm font-bold text-zinc-300">
            Föregående
          </span>
        )}

        {currentPage < totalPages ? (
          <Link
            href={productPageHref({
              page: nextPage,
              q,
              storeId,
              category,
              brand,
              country,
            })}
            className="min-h-11 rounded-2xl bg-accent px-4 py-3 text-center text-sm font-bold text-accent-foreground shadow-sm shadow-blue-200 transition hover:bg-blue-600"
          >
            Nästa
          </Link>
        ) : (
          <span className="min-h-11 rounded-2xl bg-zinc-100 px-4 py-3 text-center text-sm font-bold text-zinc-300">
            Nästa
          </span>
        )}
      </div>
    </nav>
  );
}

function productPageHref({
  page,
  q,
  storeId,
  category,
  brand,
  country,
}: {
  page: number;
  q: string;
  storeId: string;
  category: string;
  brand: string;
  country: string;
}): string {
  const params = new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (storeId) {
    params.set("storeId", storeId);
  }

  if (category) {
    params.set("category", category);
  }

  if (brand) {
    params.set("brand", brand);
  }

  if (country) {
    params.set("country", country);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/admin/products?${query}` : "/admin/products";
}

function parsePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
