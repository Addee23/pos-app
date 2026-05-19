import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProductEditForm } from "@/components/products/ProductEditForm";

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/kassa");
  }

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      store: { select: { name: true } },
      variants: { orderBy: { name: "asc" } },
    },
  });

  if (!product) {
    notFound();
  }

  return (
    <section className="flex flex-col gap-4">
      <Link
        href="/admin/products"
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800"
      >
        ← Tillbaka till produkter
      </Link>
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Redigera produkt</h2>
        <p className="text-sm text-zinc-500">{product.store.name}</p>
      </div>
      <ProductEditForm product={product} />
    </section>
  );
}
