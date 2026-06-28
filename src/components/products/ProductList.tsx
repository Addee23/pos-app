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
    <ul className="flex flex-wrap gap-3">
      {products.map((product) => {
        const outOfStock = isOutOfStock(product);
        return (
          <li
            key={product.id}
            className={`flex w-[calc(50%-6px)] flex-col overflow-hidden rounded-2xl shadow-sm ${
              outOfStock
                ? "border border-red-200 bg-red-50"
                : "border border-[#dfd4c6] bg-[#f8f4ed]"
            }`}
          >
            <ProductCard product={product} outOfStock={outOfStock} />
            <div className={`border-t px-2.5 pb-2.5 pt-2 ${outOfStock ? "border-red-200" : "border-[#dfd4c6]"}`}>
              <ProductActions
                productId={product.id}
                productName={product.name}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function isOutOfStock(product: ProductWithRelations): boolean {
  if (product.productType === "VARIABLE") {
    return product.variants.length > 0 && product.variants.every((v) => v.stockQuantity <= 0);
  }
  return product.stockQuantity <= 0;
}

function ProductCard({
  product,
  outOfStock,
}: {
  product: ProductWithRelations;
  outOfStock: boolean;
}) {
  const isVariable = product.productType === "VARIABLE";
  const singleVariant = isVariable && product.variants.length === 1 ? product.variants[0] : null;
  const inStockVariants = isVariable ? product.variants.filter((v) => v.stockQuantity > 0) : [];

  const displayPrice = singleVariant ? singleVariant.price : product.price;
  const displayStock = singleVariant ? singleVariant.stockQuantity : product.stockQuantity;
  const displayEan = singleVariant ? singleVariant.ean : product.ean;
  const displayLocation = singleVariant ? singleVariant.stockLocation : product.stockLocation;
  const displayImage = singleVariant?.imageUrl ?? product.imageUrl;

  return (
    <article className="flex flex-1 flex-col">
      <ProductImageSquare
        imageUrl={displayImage}
        name={product.name}
        dimmed={outOfStock}
      />

      <div className="p-2.5">
        <p className={`line-clamp-1 text-xs font-semibold leading-4 ${outOfStock ? "text-zinc-400" : "text-[#43342c]"}`}>
          {product.name}
        </p>

        {singleVariant ? (
          <p className={`mt-0.5 text-[10px] font-semibold ${outOfStock ? "text-zinc-400" : "text-orange-700"}`}>
            {singleVariant.name}
          </p>
        ) : (
          <p className={`mt-0.5 text-[10px] font-semibold ${outOfStock ? "text-zinc-400" : "text-orange-700"}`}>
            {product.store.name}
          </p>
        )}

        <p className={`mt-0.5 text-sm font-bold ${outOfStock ? "text-zinc-400" : "text-[#43342c]"}`}>
          {formatPrice(displayPrice)} kr
        </p>

        {!(isVariable && !singleVariant) ? (
          <p className={`mt-0.5 text-[10px] font-semibold ${outOfStock ? "text-red-400" : "text-zinc-400"}`}>
            {outOfStock ? "Slut i lager" : `${displayStock} st i lager`}
          </p>
        ) : null}
      </div>

      <div className={`mx-2.5 mb-2.5 overflow-hidden rounded-xl border text-xs ${outOfStock ? "border-red-200" : "border-[#dfd4c6]"}`}>
        <InfoBox label="EAN" value={displayEan ?? "-"} outOfStock={outOfStock} />
        <InfoBox label="Plats" value={displayLocation ?? "-"} outOfStock={outOfStock} />
      </div>

      {isVariable && !singleVariant ? (
        <div className="flex flex-wrap gap-1 px-2.5 pb-2.5">
          {inStockVariants.length > 0 ? (
            inStockVariants.map((v) => (
              <Chip key={v.id} label={v.name} highlight />
            ))
          ) : (
            <Chip label="Alla varianter slut" dim />
          )}
        </div>
      ) : product.category || product.brand || product.country ? (
        <div className="flex flex-wrap gap-1 px-2.5 pb-2.5">
          {product.category ? <Chip label={product.category} /> : null}
          {product.brand ? <Chip label={product.brand} /> : null}
          {product.country ? <Chip label={product.country} /> : null}
        </div>
      ) : null}
    </article>
  );
}

function ProductImageSquare({
  imageUrl,
  name,
  dimmed = false,
}: {
  imageUrl: string | null;
  name: string;
  dimmed?: boolean;
}) {
  const base = `aspect-square w-full bg-contain bg-center bg-no-repeat transition-opacity ${dimmed ? "opacity-40" : ""}`;

  if (!imageUrl) {
    return (
      <div className={`flex items-center justify-center bg-zinc-50 text-xs font-bold text-orange-600 ${base}`}>
        Bild
      </div>
    );
  }

  return (
    <div
      aria-label={name}
      role="img"
      className={`bg-white ${base}`}
      style={{ backgroundImage: `url("${imageUrl}")` }}
    />
  );
}

function InfoBox({
  label,
  value,
  outOfStock,
}: {
  label: string;
  value: string;
  outOfStock: boolean;
}) {
  return (
    <div className={`grid grid-cols-[1fr_auto] gap-2 border-b px-2.5 py-1.5 last:border-b-0 ${outOfStock ? "border-red-200 bg-red-50/60" : "border-[#dfd4c6] bg-[#f3eee5]"}`}>
      <p className={`font-bold ${outOfStock ? "text-zinc-400" : "text-[#6a5b50]"}`}>{label}</p>
      <p className={`max-w-28 wrap-break-word text-right font-bold ${outOfStock ? "text-zinc-400" : "text-blue-700"}`}>{value}</p>
    </div>
  );
}

function Chip({
  label,
  highlight = false,
  dim = false,
}: {
  label: string;
  highlight?: boolean;
  dim?: boolean;
}) {
  return (
    <span
      className={`max-w-full truncate rounded-full px-2 py-1 text-[10px] font-semibold ${
        highlight
          ? "bg-green-100 text-green-800"
          : dim
            ? "bg-red-100 text-red-400"
            : "bg-white text-[#75675d]"
      }`}
    >
      {label}
    </span>
  );
}

function formatPrice(value: Product["price"]): string {
  return Number(value).toFixed(2);
}
