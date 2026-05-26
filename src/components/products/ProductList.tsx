import type { Product, ProductVariant, Store } from "@/generated/prisma/client";
import { ProductActions } from "@/components/products/ProductActions";

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
        <li
          key={product.id}
          className="rounded-[1.75rem] border border-[#dfd4c6] bg-[#f8f4ed] p-3 shadow-sm"
        >
          <ProductCard product={product} />
          <div className="mt-3 border-t border-[#dfd4c6] pt-3">
            <ProductActions
              productId={product.id}
              productName={product.name}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ProductCard({ product }: { product: ProductWithRelations }) {
  return (
    <article className="flex flex-col gap-3">
      <div className="grid grid-cols-[88px_1fr] gap-3">
        <ProductImage imageUrl={product.imageUrl} name={product.name} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="line-clamp-2 text-base font-bold leading-5 text-[#43342c]">
                {product.name}
              </p>
              <p className="mt-1 text-xs font-semibold text-orange-700">
                {product.store.name}
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-bold text-[#6a5b50]">
              {product.productType === "VARIABLE" ? "Variabel" : "Enkel"}
            </span>
          </div>

          {product.metaDescription ? (
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#75675d]">
              {product.metaDescription}
            </p>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#dfd4c6] text-sm">
        <InfoBox label="Pris" value={`${formatPrice(product.price)} kr`} />
        <InfoBox label="Lager" value={`${product.stockQuantity} st`} />
        <InfoBox label="EAN" value={product.ean ?? "-"} />
        <InfoBox label="Lagerplats" value={product.stockLocation ?? "-"} />
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-[#75675d]">
        {product.category ? <Chip label={product.category} /> : null}
        {product.brand ? <Chip label={product.brand} /> : null}
        {product.country ? <Chip label={product.country} /> : null}
        <Chip label={`Slug ${product.slug}`} />
        {product.productType === "VARIABLE" ? (
          <Chip label={`${product.variants.length} varianter`} />
        ) : null}
      </div>
    </article>
  );
}

function ProductImage({
  imageUrl,
  name,
}: {
  imageUrl: string | null;
  name: string;
}) {
  if (!imageUrl) {
    return (
      <div className="flex h-28 w-[88px] shrink-0 items-center justify-center rounded-3xl bg-white text-xs font-bold text-orange-600">
        Bild
      </div>
    );
  }

  return (
    <div
      aria-label={name}
      role="img"
      className="h-28 w-[88px] shrink-0 rounded-3xl border border-[#dfd4c6] bg-white bg-contain bg-center bg-no-repeat"
      style={{ backgroundImage: `url("${imageUrl}")` }}
    />
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#dfd4c6] bg-[#f3eee5] px-3 py-2 last:border-b-0">
      <p className="text-xs font-bold text-[#6a5b50]">{label}</p>
      <p className="max-w-36 break-words text-right text-xs font-bold text-blue-700">
        {value}
      </p>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="max-w-full truncate rounded-full bg-white px-2 py-1 font-semibold">
      {label}
    </span>
  );
}

function formatPrice(value: Product["price"]): string {
  return Number(value).toFixed(2);
}
