import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProductList } from "@/components/products/ProductList";
import { ProductSearch } from "@/components/products/ProductSearch";

type ProductsPageProps = {
  searchParams: Promise<{ q?: string; storeId?: string }>;
};

export default async function AdminProductsPage({
  searchParams,
}: ProductsPageProps) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/kassa");
  }

  const { q, storeId } = await searchParams;

  const [stores, products] = await Promise.all([
    prisma.store.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: {
        ...(storeId ? { storeId } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { ean: { contains: q } },
                { slug: { contains: q } },
              ],
            }
          : {}),
      },
      include: {
        store: { select: { id: true, name: true } },
        variants: { orderBy: { name: "asc" } },
      },
      orderBy: { name: "asc" },
      take: 50,
    }),
  ]);

  return (
    <section className="flex flex-col gap-4">
      <ProductsHeader productCount={products.length} storeCount={stores.length} />
      <Suspense>
        <ProductSearch
          stores={stores}
          initialQuery={q ?? ""}
          initialStoreId={storeId ?? ""}
        />
      </Suspense>
      <ProductList products={products} />
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
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        Admin
      </p>
      <h2 className="mt-1 text-xl font-semibold text-zinc-900">Produkter</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        Sök, filtrera och uppdatera pris, EAN, lager och lagerplats.
        Produktnamn kommer från WooCommerce och är skrivskyddat.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <SummaryBox label="Visade produkter" value={String(productCount)} />
        <SummaryBox label="Butiker" value={String(storeCount)} />
      </div>
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
