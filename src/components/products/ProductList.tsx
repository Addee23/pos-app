"use client";

import { useState } from "react";
import { ProductActions } from "@/components/products/ProductActions";

export type SerializedVariant = {
  id: string;
  wooVariantId: number;
  name: string;
  price: string;
  ean: string | null;
  imageUrl: string | null;
  metaDescription: string | null;
  shortDescription: string | null;
  stockQuantity: number;
  stockLocation: string | null;
};

export type ProductWithRelations = {
  id: string;
  wooProductId: number;
  name: string;
  slug: string;
  permalink: string | null;
  productType: "SIMPLE" | "VARIABLE";
  price: string;
  ean: string | null;
  imageUrl: string | null;
  metaDescription: string | null;
  shortDescription: string | null;
  category: string | null;
  brand: string | null;
  country: string | null;
  stockQuantity: number;
  stockLocation: string | null;
  store: { id: string; name: string };
  variants: SerializedVariant[];
};

type ProductListProps = {
  products: ProductWithRelations[];
};

export function ProductList({ products }: ProductListProps) {
  const [selected, setSelected] = useState<ProductWithRelations | null>(null);

  if (products.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
        Inga produkter hittades. Prova en annan sökning eller butik.
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-wrap gap-3">
        {products.map((product) => {
          const outOfStock = isOutOfStock(product);
          return (
            <li
              key={product.id}
              className={`flex w-[calc(50%-6px)] flex-col overflow-hidden rounded-2xl shadow-sm transition-transform active:scale-95 ${
                outOfStock
                  ? "border border-red-200 bg-red-50"
                  : "cursor-pointer border border-[#dfd4c6] bg-[#f8f4ed] hover:border-orange-300 hover:shadow-md"
              }`}
              onClick={() => setSelected(product)}
            >
              <ProductCard product={product} outOfStock={outOfStock} />
              <div
                className={`border-t px-2.5 pb-2.5 pt-2 ${outOfStock ? "border-red-200" : "border-[#dfd4c6]"}`}
                onClick={(e) => e.stopPropagation()}
              >
                <ProductActions
                  productId={product.id}
                  productName={product.name}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {selected ? (
        <ProductDetailModal
          product={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}

function ProductDetailModal({
  product,
  onClose,
}: {
  product: ProductWithRelations;
  onClose: () => void;
}) {
  const outOfStock = isOutOfStock(product);
  const isVariable = product.productType === "VARIABLE";
  const inStockVariants = isVariable ? product.variants.filter((v) => v.stockQuantity > 0) : [];

  return (
    <div
      className="fixed inset-0 z-90 flex items-end justify-center bg-zinc-950/35 px-3 pb-3 pt-10 lg:items-center lg:p-6"
      onClick={onClose}
    >
      <section
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-4xl bg-[#f3eee5] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
              {product.store.name}
            </p>
            <h3 className="mt-1 text-lg font-bold text-[#43342c]">
              {product.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/80 text-sm font-bold text-zinc-500"
            aria-label="Stäng"
          >
            ✕
          </button>
        </div>

        {product.imageUrl ? (
          <div
            className="mt-3 h-48 w-full rounded-2xl bg-white bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${product.imageUrl}")` }}
          />
        ) : null}

        <div className="mt-3 flex items-baseline gap-2">
          <span className={`text-xl font-bold ${outOfStock ? "text-zinc-400" : "text-[#43342c]"}`}>
            {formatPrice(product.price)} kr
          </span>
          {outOfStock ? (
            <span className="text-xs font-semibold text-red-500">Slut i lager</span>
          ) : (
            <span className="text-xs font-semibold text-zinc-400">{product.stockQuantity} st i lager</span>
          )}
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-[#dfd4c6] text-xs">
          <InfoRow label="EAN" value={product.ean ?? "-"} />
          <InfoRow label="Plats" value={product.stockLocation ?? "-"} />
          {product.category ? <InfoRow label="Kategori" value={product.category} /> : null}
          {product.brand ? <InfoRow label="Varumärke" value={product.brand} /> : null}
          {product.country ? <InfoRow label="Land" value={product.country} /> : null}
        </div>

        {product.metaDescription ? (
          <p className="mt-3 text-xs leading-5 text-[#6a5b50]">{product.metaDescription}</p>
        ) : null}

        {isVariable && product.variants.length > 0 ? (
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-bold text-[#6a5b50]">Varianter</p>
            <div className="flex flex-wrap gap-1.5">
              {product.variants.map((v) => (
                <span
                  key={v.id}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    v.stockQuantity > 0
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-400"
                  }`}
                >
                  {v.name} · {v.stockQuantity} st
                </span>
              ))}
            </div>
            {inStockVariants.length === 0 ? (
              <p className="mt-1.5 text-[10px] font-semibold text-red-400">Alla varianter slut i lager</p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4" onClick={(e) => e.stopPropagation()}>
          <ProductActions productId={product.id} productName={product.name} />
        </div>
      </section>
    </div>
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
      <ProductImage imageUrl={displayImage} name={product.name} dimmed={outOfStock} />

      <div className="p-2.5">
        <p className={`line-clamp-1 text-xs font-semibold leading-4 ${outOfStock ? "text-zinc-400" : "text-[#43342c]"}`}>
          {product.name}
        </p>
        <p className={`mt-0.5 text-[10px] font-semibold ${outOfStock ? "text-zinc-400" : "text-orange-700"}`}>
          {singleVariant ? singleVariant.name : product.store.name}
        </p>
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
            inStockVariants.map((v) => <Chip key={v.id} label={v.name} highlight />)
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

function ProductImage({
  imageUrl,
  name,
  dimmed = false,
}: {
  imageUrl: string | null;
  name: string;
  dimmed?: boolean;
}) {
  const base = `h-36 w-full bg-contain bg-center bg-no-repeat transition-opacity ${dimmed ? "opacity-40" : ""}`;

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-[#dfd4c6] bg-[#f3eee5] px-2.5 py-1.5 last:border-b-0">
      <p className="font-bold text-[#6a5b50]">{label}</p>
      <p className="max-w-40 wrap-break-word text-right font-bold text-blue-700">{value}</p>
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

function formatPrice(value: string): string {
  return Number(value).toFixed(2);
}
