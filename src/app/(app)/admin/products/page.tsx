import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProductList } from "@/components/products/ProductList";
import { ProductSearch } from "@/components/products/ProductSearch";

type ProductsPageProps = {
  searchParams: Promise<{ q?: string; storeId?: string }>;
};

export default async function AdminProductsPage({ searchParams }: ProductsPageProps) {
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
    <section className="flex flex-col gap-6">
      <ProductsHeader />
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

function ProductsHeader() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-900">Produkter</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Sök, filtrera per butik och uppdatera pris, EAN, lager och lagerplats.
        Produktnamn kan inte ändras.
      </p>
    </div>
  );
}
