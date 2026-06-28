"use client";

import { useEffect, useState } from "react";

export type SearchProduct = {
  id: string;
  name: string;
  productType: "SIMPLE" | "VARIABLE";
  storeName: string;
  category: string | null;
  brand: string | null;
  country: string | null;
  slug: string;
  permalink: string | null;
  price: number;
  ean: string | null;
  imageUrl: string | null;
  metaDescription: string | null;
  stockQuantity: number;
  stockLocation: string | null;
  variants: SearchProductVariant[];
};

export type SearchProductVariant = {
  id: string;
  name: string;
  price: number;
  ean: string | null;
  imageUrl: string | null;
  metaDescription: string | null;
  stockQuantity: number;
  stockLocation: string | null;
};

type ProductSearchPopupClientProps = {
  products: SearchProduct[];
  hasQuery: boolean;
  /** Ändras vid ny sökning/filter så popup kan öppnas automatiskt. */
  searchToken: string;
};

export function ProductSearchPopupClient({
  products,
  hasQuery,
  searchToken,
}: ProductSearchPopupClientProps) {
  const [dismissedToken, setDismissedToken] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(
    () => hasQuery && products.length > 0,
  );

  useEffect(() => {
    if (!hasQuery) {
      setIsOpen(false);
      setDismissedToken(null);
      return;
    }

    if (products.length > 0 && dismissedToken !== searchToken) {
      setIsOpen(true);
    }
  }, [hasQuery, products.length, searchToken, dismissedToken]);

  function handleClose() {
    setIsOpen(false);
    setDismissedToken(searchToken);
  }

  if (!hasQuery) {
    return (
      <p className="rounded-3xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
        Sök eller välj filter (kategori, varumärke, land) för att visa
        produkter.
      </p>
    );
  }

  if (products.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
        Inga produkter hittades. Prova namn, EAN, slug eller QR-länk.
      </p>
    );
  }

  return (
    <>
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="min-h-11 w-full cursor-pointer rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
        >
          Öppna sökresultat igen
        </button>
      ) : null}

      {isOpen ? (
        <SearchInfoPopup products={products} onClose={handleClose} />
      ) : null}
    </>
  );
}

function SearchInfoPopup({
  products,
  onClose,
}: {
  products: SearchProduct[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-zinc-950/35 px-3 pb-3 pt-10 lg:items-center lg:p-6" onClick={onClose}>
      <section className="max-h-[88vh] w-full max-w-[430px] overflow-y-auto rounded-[2rem] bg-[#f3eee5] p-4 shadow-2xl lg:max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
              Sökresultat
            </p>
            <h3 className="mt-1 text-lg font-bold text-[#43342c]">
              Produktinformation
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/80 text-sm font-bold text-zinc-500"
            aria-label="Stäng sökresultat"
          >
            x
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {products.map((product) => (
            <SearchInfoCard
              key={product.id}
              product={product}
              onClose={onClose}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function SearchInfoCard({
  product,
  onClose: _onClose,
}: {
  product: SearchProduct;
  onClose: () => void;
}) {
  const options = getProductOptions(product);
  const [selectedKey, setSelectedKey] = useState(options[0].key);
  const selectedOption =
    options.find((option) => option.key === selectedKey) ?? options[0];
  const hasVariants = options.length > 1 || selectedOption.variantName !== null;
  const outOfStock = selectedOption.stockQuantity <= 0;

  return (
    <article
      className={`flex w-[calc(50%-6px)] flex-col overflow-hidden rounded-2xl shadow-sm ${
        outOfStock
          ? "border border-red-200 bg-red-50"
          : "border border-[#dfd4c6] bg-[#f8f4ed]"
      }`}
    >
      <ProductImageSquare
        imageUrl={selectedOption.imageUrl ?? product.imageUrl}
        name={product.name}
        dimmed={outOfStock}
      />

      <div className="flex flex-1 flex-col p-2.5">
        <p className={`line-clamp-1 text-xs font-semibold leading-4 ${outOfStock ? "text-zinc-400" : "text-[#43342c]"}`}>
          {product.name}
        </p>
        <p className={`mt-0.5 text-[10px] font-semibold ${outOfStock ? "text-zinc-400" : "text-orange-700"}`}>
          {product.storeName}
        </p>
        <p className={`mt-0.5 text-sm font-bold ${outOfStock ? "text-zinc-400" : "text-[#43342c]"}`}>
          {formatPrice(selectedOption.price)} kr
        </p>
        <p className={`mt-0.5 text-[10px] font-semibold ${outOfStock ? "text-red-400" : "text-zinc-400"}`}>
          {outOfStock ? "Slut i lager" : `${selectedOption.stockQuantity} st i lager`}
        </p>

        {hasVariants ? (
          <select
            value={selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
            className="mt-2 w-full cursor-pointer rounded-lg border border-[#c9bdae] bg-white px-2 py-1.5 text-xs text-[#43342c] outline-none focus:border-orange-300"
          >
            {options.map((option) => (
              <option key={option.key} value={option.key}>
                {option.variantName ?? "Standard"} – {formatPrice(option.price)} kr
              </option>
            ))}
          </select>
        ) : null}

        <div className="mt-2 overflow-hidden rounded-xl border border-[#dfd4c6]">
          <ProductFact label="EAN" value={selectedOption.ean ?? "-"} />
          <ProductFact label="Lager" value={`${selectedOption.stockQuantity} st`} />
          <ProductFact label="Slug" value={product.slug} />
        </div>

        {product.category || product.brand || product.country ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {product.category ? <TaxonomyChip label={product.category} /> : null}
            {product.brand ? <TaxonomyChip label={product.brand} /> : null}
            {product.country ? <TaxonomyChip label={product.country} /> : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

type ProductOption = {
  key: string;
  variantName: string | null;
  price: number;
  ean: string | null;
  imageUrl: string | null;
  description: string;
  stockQuantity: number;
  stockLocation: string | null;
};

function getProductOptions(product: SearchProduct): ProductOption[] {
  if (product.variants.length > 0) {
    return product.variants.map((variant) => ({
      key: `variant:${variant.id}`,
      variantName: variant.name,
      price: variant.price,
      ean: variant.ean,
      imageUrl: variant.imageUrl,
      description:
        variant.metaDescription ??
        product.metaDescription ??
        "Metabeskrivning saknas för den här varianten.",
      stockQuantity: variant.stockQuantity,
      stockLocation: variant.stockLocation,
    }));
  }

  return [
    {
      key: `product:${product.id}`,
      variantName: null,
      price: product.price,
      ean: product.ean,
      imageUrl: product.imageUrl,
      description:
        product.metaDescription ?? "Metabeskrivning saknas för den här produkten.",
      stockQuantity: product.stockQuantity,
      stockLocation: product.stockLocation,
    },
  ];
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

function ProductFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 border-b border-[#dfd4c6] bg-[#f3eee5] px-3 py-2.5 text-xs last:border-b-0">
      <p className="shrink-0 font-bold text-[#6a5b50]">{label}</p>
      <p className="break-words text-right font-bold text-blue-700">{value}</p>
    </div>
  );
}

function TaxonomyChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#75675d]">
      {label}
    </span>
  );
}

function formatPrice(value: number): string {
  return value.toFixed(2);
}
