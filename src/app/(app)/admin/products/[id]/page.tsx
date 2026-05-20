import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProductAuditLogList } from "@/components/products/ProductAuditLogList";
import { ProductEditForm } from "@/components/products/ProductEditForm";

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
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

  const variantIds = product.variants.map((variant) => variant.id);
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: "Product", entityId: product.id },
        ...(variantIds.length > 0
          ? [{ entityType: "ProductVariant", entityId: { in: variantIds } }]
          : []),
      ],
    },
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <section className="flex flex-col gap-4">
      <Link
        href="/admin/products"
        className="w-fit cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
      >
        Tillbaka
      </Link>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          {product.store.name}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-900">
          {product.name}
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <MetaItem label="Woo ID" value={String(product.wooProductId)} />
          <MetaItem label="Typ" value={product.productType} />
          <MetaItem label="Slug" value={product.slug} wide />
          <MetaItem label="Permalink" value={product.permalink ?? "-"} wide />
        </dl>
      </div>

      <ProductEditForm product={product} />
      <ProductAuditLogList logs={auditLogs} />
    </section>
  );
}

function MetaItem({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="text-xs font-medium text-zinc-400">{label}</dt>
      <dd className="mt-0.5 break-words text-zinc-800">{value}</dd>
    </div>
  );
}
