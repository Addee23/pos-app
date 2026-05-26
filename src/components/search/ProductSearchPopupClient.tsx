"use client";

import { useState } from "react";

export type SearchProduct = {
  id: string;
  name: string;
  productType: "SIMPLE" | "VARIABLE";
  storeName: string;
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
};

export function ProductSearchPopupClient({
  products,
  hasQuery,
}: ProductSearchPopupClientProps) {
  const [isOpen, setIsOpen] = useState(hasQuery && products.length > 0);

  if (!hasQuery) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
        Sök på namn, EAN, slug eller WooCommerce-länk för att visa produkter.
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
        <SearchInfoPopup products={products} onClose={() => setIsOpen(false)} />
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
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-zinc-950/35 px-3 pb-3 pt-10">
      <section className="max-h-[88vh] w-full max-w-[430px] overflow-y-auto rounded-[2rem] bg-[#f3eee5] p-4 shadow-2xl">
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

        <div className="mt-4 flex flex-col gap-3">
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
  onClose,
}: {
  product: SearchProduct;
  onClose: () => void;
}) {
  const options = getProductOptions(product);
  const [selectedKey, setSelectedKey] = useState(options[0].key);
  const selectedOption =
    options.find((option) => option.key === selectedKey) ?? options[0];
  const hasVariants = options.length > 1 || selectedOption.variantName !== null;

  return (
    <article className="rounded-[1.75rem] border border-[#dfd4c6] bg-[#f8f4ed] p-4 shadow-sm">
      <div className="grid grid-cols-[112px_1fr] gap-4">
        <ProductImageLarge
          imageUrl={selectedOption.imageUrl ?? product.imageUrl}
          name={product.name}
        />
        <div className="min-w-0">
          <p className="text-xl font-bold leading-6 text-[#43342c]">
            {product.name}
          </p>
          <p className="mt-1 text-xs font-semibold text-orange-700">
            {product.storeName}
          </p>
          <p className="mt-2 line-clamp-4 text-xs leading-5 text-[#75675d]">
            {selectedOption.description}
          </p>
        </div>
      </div>

      {hasVariants ? (
        <label className="mt-4 flex flex-col gap-1 text-sm font-bold text-[#43342c]">
          Förpackning
          <select
            value={selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
            className="min-h-11 cursor-pointer rounded-xl border border-[#c9bdae] bg-white px-3 text-sm font-semibold text-[#43342c] outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-500/10"
          >
            {options.map((option) => (
              <option key={option.key} value={option.key}>
                {option.variantName ?? "Standard"} - {formatPrice(option.price)} kr
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#dfd4c6]">
        <ProductFact label="Pris" value={`${formatPrice(selectedOption.price)} kr`} />
        <ProductFact label="Lager" value={`${selectedOption.stockQuantity} st`} />
        <ProductFact label="EAN" value={selectedOption.ean ?? "-"} />
        <ProductFact
          label="Lagerplats"
          value={selectedOption.stockLocation ?? "-"}
        />
        <ProductFact label="Slug" value={product.slug} />
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-4 min-h-12 w-full cursor-pointer rounded-xl bg-orange-500 px-4 text-sm font-bold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600"
      >
        Stäng
      </button>
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

function ProductImageLarge({
  imageUrl,
  name,
}: {
  imageUrl: string | null;
  name: string;
}) {
  if (!imageUrl) {
    return (
      <div className="flex h-44 w-28 shrink-0 items-center justify-center rounded-3xl bg-white text-xs font-bold text-orange-600">
        Bild
      </div>
    );
  }

  return (
    <div
      aria-label={name}
      role="img"
      className="h-44 w-28 shrink-0 rounded-3xl border border-[#dfd4c6] bg-white bg-contain bg-center bg-no-repeat"
      style={{ backgroundImage: `url("${imageUrl}")` }}
    />
  );
}

function ProductFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#dfd4c6] bg-[#f3eee5] px-3 py-2 text-xs last:border-b-0">
      <p className="font-bold text-[#6a5b50]">{label}</p>
      <p className="max-w-40 break-words text-right font-bold text-blue-700">
        {value}
      </p>
    </div>
  );
}

function formatPrice(value: number): string {
  return value.toFixed(2);
}
