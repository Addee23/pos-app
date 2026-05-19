import Link from "next/link";
import type { Product, ProductVariant, Store } from "@/generated/prisma/client";

export type ProductWithRelations = Product & {
  store: Pick<Store, "id" | "name">;
  variants: ProductVariant[];
};

type ProductListProps = {
  products: ProductWithRelations[];
};

export function ProductList({ products }: ProductListProps) {
  if (products.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
        Inga produkter hittades. Prova en annan sökning eller butik.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {products.map((product) => (
        <li key={product.id}>
          <Link
            href={`/admin/products/${product.id}`}
            className="block rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm"
          >
            <ProductCard product={product} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ProductCard({ product }: { product: ProductWithRelations }) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-zinc-900">{product.name}</p>
          <p className="text-xs text-zinc-500">{product.store.name}</p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-zinc-900">
          {formatPrice(product.price)} kr
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
        <span>Lager: {product.stockQuantity}</span>
        {product.ean ? <span>EAN: {product.ean}</span> : null}
        {product.productType === "VARIABLE" ? (
          <span>{product.variants.length} varianter</span>
        ) : null}
      </div>
    </>
  );
}

function formatPrice(value: Product["price"]): string {
  return Number(value).toFixed(2);
}
