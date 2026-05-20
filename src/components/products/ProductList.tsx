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
      <p className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
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
            className="block cursor-pointer rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm"
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
    <article className="flex flex-col gap-3">
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

      <div className="grid grid-cols-2 gap-2 text-sm">
        <InfoBox label="Pris" value={`${formatPrice(product.price)} kr`} />
        <InfoBox label="Lager" value={String(product.stockQuantity)} />
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
        {product.ean ? <Chip label={`EAN ${product.ean}`} /> : null}
        <Chip label={`Slug ${product.slug}`} />
        {product.productType === "VARIABLE" ? (
          <Chip label={`${product.variants.length} varianter`} />
        ) : null}
      </div>
    </article>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-0.5 font-semibold text-zinc-900">{value}</p>
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

function formatPrice(value: Product["price"]): string {
  return Number(value).toFixed(2);
}
