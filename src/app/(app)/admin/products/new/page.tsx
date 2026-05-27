import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminDashboardLink } from "@/components/layout/AdminDashboardLink";
import { ProductCreateForm } from "@/components/products/ProductCreateForm";

export default async function NewProductPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/kassa");
  }

  const stores = await prisma.store.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const defaultStoreId = session.user.storeId ?? stores[0]?.id ?? "";

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/products"
          className="w-fit cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
        >
          Till produkter
        </Link>
        <AdminDashboardLink />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Admin
        </p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-900">
          Lägg till produkt
        </h2>
      </div>

      <ProductCreateForm stores={stores} defaultStoreId={defaultStoreId} />
    </section>
  );
}
