"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { clearCart, saveCart } from "@/lib/cart-storage";
import { asMetadataRecord, formatStoredMetaValue } from "@/lib/woo-product-metadata";

export type SearchProduct = {
  id: string;
  storeId: string;
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
  shortDescription: string | null;
  stockQuantity: number;
  stockLocation: string | null;
  wooMetadata: Record<string, unknown> | null;
  variants: SearchProductVariant[];
};

export type SearchProductVariant = {
  id: string;
  name: string;
  price: number;
  ean: string | null;
  imageUrl: string | null;
  shortDescription: string | null;
  stockQuantity: number;
  stockLocation: string | null;
};

type SökCartItem = {
  key: string;
  productId: string;
  variantId: string | null;
  storeId: string;
  name: string;
  variantName: string | null;
  ean: string | null;
  imageUrl: string | null;
  description: string | null;
  stockLocation: string | null;
  price: number;
  quantity: number;
  maxQuantity: number;
};

type ProductSearchPopupClientProps = {
  products: SearchProduct[];
  hasQuery: boolean;
  searchToken: string;
  filterVersion?: number;
  storeMetaLabels?: Record<string, Record<string, string>>;
};

export function ProductSearchPopupClient({
  products,
  hasQuery,
  searchToken,
  filterVersion = 0,
  storeMetaLabels = {},
}: ProductSearchPopupClientProps) {
  const toast = useToast();
  const [dismissedToken, setDismissedToken] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(() => hasQuery && products.length > 0);
  const [resultsStale, setResultsStale] = useState(false);
  const [cart, setCart] = useState<SökCartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const filterVersionMounted = useRef(false);

  useEffect(() => {
    if (!hasQuery) {
      setIsOpen(false);
      setDismissedToken(null);
      setResultsStale(false);
      return;
    }
    if (products.length > 0 && dismissedToken !== searchToken) {
      setIsOpen(true);
      setResultsStale(false);
    }
  }, [hasQuery, products.length, searchToken, dismissedToken]);

  useEffect(() => {
    if (!filterVersionMounted.current) {
      filterVersionMounted.current = true;
      return;
    }
    setIsOpen(false);
    setResultsStale(true);
  }, [filterVersion]);

  useEffect(() => {
    if (cart.length === 0) return;
    saveCart(cart[0].storeId, cart.map((item) => ({
      cartKey: item.key,
      productId: item.productId,
      variantId: item.variantId,
      storeId: item.storeId,
      name: item.name,
      variantName: item.variantName,
      ean: item.ean,
      imageUrl: item.imageUrl,
      description: item.description ?? "",
      stockLocation: item.stockLocation,
      price: item.price,
      quantity: item.quantity,
      maxQuantity: item.maxQuantity,
    })));
  }, [cart]);

  function handleClose() {
    setIsOpen(false);
    setDismissedToken(searchToken);
  }

  function addToCart(product: SearchProduct, selectedKey: string) {
    const allOptions = getProductOptions(product);
    const option = allOptions.find((o) => o.key === selectedKey) ?? allOptions[0];

    if (option.stockQuantity <= 0) {
      toast.error("Varan är slut i lager.");
      return;
    }

    const cartStoreId = cart[0]?.storeId;
    if (cartStoreId && cartStoreId !== product.storeId) {
      toast.error("Du kan inte blanda produkter från olika butiker i samma köp.");
      return;
    }

    const variantId = selectedKey.startsWith("variant:") ? selectedKey.replace("variant:", "") : null;

    setCart((prev) => {
      const existing = prev.find((i) => i.key === selectedKey);
      if (existing) {
        if (existing.quantity >= existing.maxQuantity) {
          toast.error(`Bara ${existing.maxQuantity} st i lager för "${existing.name}".`);
          return prev;
        }
        return prev.map((i) =>
          i.key === selectedKey ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          key: selectedKey,
          productId: product.id,
          variantId,
          storeId: product.storeId,
          name: product.name,
          variantName: option.variantName,
          ean: option.ean,
          imageUrl: option.imageUrl ?? product.imageUrl,
          description: option.description,
          stockLocation: option.stockLocation,
          price: option.price,
          quantity: 1,
          maxQuantity: option.stockQuantity,
        },
      ];
    });

    const label = option.variantName ? `${product.name} – ${option.variantName}` : product.name;
    toast.success(`${label} lades till i varukorgen.`);
  }

  async function checkout() {
    if (cart.length === 0) return;
    const storeId = cart[0].storeId;
    setSaving(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          items: cart.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Kunde inte slutföra köpet.");
        return;
      }
      setDone(true);
      setCart([]);
      clearCart();
      toast.success("Köpet slutfördes och lagret uppdaterades.");
    } catch {
      toast.error("Något gick fel. Försök igen.");
    } finally {
      setSaving(false);
    }
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  if (!hasQuery) {
    return (
      <p className="rounded-3xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
        Sök eller välj filter (kategori, varumärke, land) för att visa produkter.
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

      {isOpen ? (
        <SearchInfoPopup products={products} storeMetaLabels={storeMetaLabels} onClose={handleClose} onAdd={addToCart} />
      ) : null}

      {cartCount > 0 ? (
        <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-[100] flex justify-center px-4">
          <button
            type="button"
            onClick={() => { setCartOpen(true); setDone(false); }}
            className="flex items-center gap-3 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
              {cartCount}
            </span>
            Varukorg · {cartTotal.toFixed(2)} kr
          </button>
        </div>
      ) : null}

      {cartOpen ? (
        <SökCartPanel
          cart={cart}
          total={cartTotal}
          saving={saving}
          done={done}
          onClose={() => setCartOpen(false)}
          onCheckout={() => void checkout()}
          onRemove={(key) => setCart((prev) => prev.filter((i) => i.key !== key))}
          onClear={() => { setCart([]); clearCart(); setCartOpen(false); }}
          onChangeQty={(key, qty) =>
            setCart((prev) =>
              prev.flatMap((i) => {
                if (i.key !== key) return [i];
                if (qty <= 0) return [];
                return [{ ...i, quantity: Math.min(qty, i.maxQuantity) }];
              }),
            )
          }
        />
      ) : null}
    </>
  );
}

function SökCartPanel({
  cart,
  total,
  saving,
  done,
  onClose,
  onCheckout,
  onRemove,
  onClear,
  onChangeQty,
}: {
  cart: SökCartItem[];
  total: number;
  saving: boolean;
  done: boolean;
  onClose: () => void;
  onCheckout: () => void;
  onRemove: (key: string) => void;
  onClear: () => void;
  onChangeQty: (key: string, qty: number) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-zinc-950/35 px-3 pb-3 pt-10 lg:items-center lg:p-6"
      onClick={onClose}
    >
      <section
        className="max-h-[88vh] w-full max-w-[430px] overflow-y-auto rounded-[2rem] bg-[#f3eee5] p-4 shadow-2xl lg:max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-orange-600">Sök</p>
            <h3 className="mt-0.5 text-lg font-bold text-[#43342c]">Varukorg</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/80 text-sm font-bold text-zinc-500"
            aria-label="Stäng varukorg"
          >
            ✕
          </button>
        </div>

        {done ? (
          <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-green-100 text-2xl">
              ✓
            </div>
            <p className="text-base font-bold text-zinc-800">Köpet slutfördes!</p>
            <p className="text-sm text-zinc-500">Lagret har uppdaterats.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 min-h-10 cursor-pointer rounded-xl bg-orange-500 px-6 text-sm font-bold text-white transition hover:bg-orange-600"
            >
              Stäng
            </button>
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-2">
              {cart.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-3 rounded-2xl border border-[#dfd4c6] bg-white px-3 py-2.5"
                >
                  {item.imageUrl ? (
                    <div
                      className="size-12 shrink-0 rounded-xl bg-contain bg-center bg-no-repeat"
                      style={{ backgroundImage: `url("${item.imageUrl}")` }}
                    />
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[9px] font-bold text-orange-600">
                      Bild
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[#43342c]">{item.name}</p>
                    {item.variantName ? (
                      <p className="truncate text-[10px] text-zinc-500">{item.variantName}</p>
                    ) : null}
                    <p className="text-xs font-semibold text-orange-700">
                      {(item.price * item.quantity).toFixed(2)} kr
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onChangeQty(item.key, item.quantity - 1)}
                      className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-bold text-zinc-600 transition hover:border-red-200 hover:text-red-600"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-zinc-800">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onChangeQty(item.key, item.quantity + 1)}
                      disabled={item.quantity >= item.maxQuantity}
                      className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-bold text-zinc-600 transition hover:border-green-300 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(item.key)}
                      className="ml-1 flex size-7 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white text-xs font-bold text-zinc-400 transition hover:border-red-200 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#dfd4c6] bg-white px-4 py-3">
              <span className="text-sm font-bold text-zinc-700">Totalt</span>
              <span className="text-lg font-bold text-[#43342c]">{total.toFixed(2)} kr</span>
            </div>

            <button
              type="button"
              onClick={onCheckout}
              disabled={saving}
              className="mt-3 min-h-12 w-full cursor-pointer rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Slutför köp..." : "Slutför köp"}
            </button>

            <button
              type="button"
              onClick={onClear}
              className="mt-2 min-h-10 w-full cursor-pointer rounded-2xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-500 transition hover:border-red-200 hover:text-red-500"
            >
              Töm varukorg
            </button>
          </>
        )}
      </section>
    </div>
  );
}

function SearchInfoPopup({
  products,
  storeMetaLabels,
  onClose,
  onAdd,
}: {
  products: SearchProduct[];
  storeMetaLabels: Record<string, Record<string, string>>;
  onClose: () => void;
  onAdd: (product: SearchProduct, selectedKey: string) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-zinc-950/35 px-3 pb-3 pt-10 lg:items-center lg:p-6"
      onClick={onClose}
    >
      <section
        className="max-h-[88vh] w-full max-w-[430px] overflow-y-auto rounded-[2rem] bg-[#f3eee5] p-4 shadow-2xl lg:max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
              Sökresultat
            </p>
            <h3 className="mt-1 text-lg font-bold text-[#43342c]">
              Produkter
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/80 text-sm font-bold text-zinc-500"
            aria-label="Stäng sökresultat"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {products.map((product) => (
            <SearchInfoCard
              key={product.id}
              product={product}
              metaLabels={storeMetaLabels[product.storeId] ?? {}}
              onClose={onClose}
              onAdd={onAdd}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function SearchInfoCard({
  product,
  metaLabels,
  onAdd,
}: {
  product: SearchProduct;
  metaLabels: Record<string, string>;
  onClose: () => void;
  onAdd: (product: SearchProduct, selectedKey: string) => void;
}) {
  const allOptions = getProductOptions(product);
  const metadata = asMetadataRecord(product.wooMetadata);
  const metaEntries: [string, string][] = metadata
    ? Object.entries(metadata).flatMap(([key, value]) => {
        const label = metaLabels[key] ?? formatMetaKey(key);
        const formatted = formatStoredMetaValue(value);
        return formatted ? [[label, formatted] as [string, string]] : [];
      })
    : [];
  const inStockOptions = allOptions.filter((o) => o.stockQuantity > 0);
  const initialKey = (inStockOptions[0] ?? allOptions[0]).key;
  const [selectedKey, setSelectedKey] = useState(initialKey);
  const [showDescription, setShowDescription] = useState(false);
  const selectedOption =
    allOptions.find((option) => option.key === selectedKey) ?? allOptions[0];
  const outOfStock = inStockOptions.length === 0;
  const hasVariants = allOptions.length > 1;

  if (showDescription) {
    return (
      <article
        className="flex w-[calc(50%-6px)] cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#dfd4c6] bg-[#f8f4ed] shadow-sm"
        onClick={() => setShowDescription(false)}
      >
        <div className="flex flex-1 flex-col p-2.5">
          <button
            type="button"
            className="mb-2 cursor-pointer text-left text-[10px] font-semibold text-orange-600 hover:text-orange-800"
          >
            ← Tillbaka
          </button>
          <p className="line-clamp-1 text-xs font-semibold leading-4 text-[#43342c]">
            {product.name}
          </p>
          <p className="mt-2 text-xs leading-5 text-[#6a5b50]">
            {selectedOption.description}
          </p>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`flex w-[calc(50%-6px)] flex-col overflow-hidden rounded-2xl shadow-sm ${
        outOfStock
          ? "border border-red-200 bg-red-50"
          : "cursor-pointer border border-[#dfd4c6] bg-[#f8f4ed] hover:border-orange-300 hover:shadow-md"
      }`}
      onClick={() => { if (!outOfStock) onAdd(product, selectedKey); }}
    >
      <ProductImageSquare
        imageUrl={selectedOption.imageUrl ?? product.imageUrl}
        name={product.name}
        dimmed={outOfStock}
      />

      <div className="p-2.5">
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
      </div>

      <div
        className={`mx-2.5 mb-2.5 overflow-hidden rounded-xl border text-xs ${outOfStock ? "border-red-200" : "border-[#dfd4c6]"}`}
      >
        <InfoBox label="Plats" value={selectedOption.stockLocation ?? "-"} outOfStock={outOfStock} />
        {metaEntries.map(([label, value]) => (
          <InfoBox key={label} label={label} value={value} outOfStock={outOfStock} />
        ))}
      </div>

      {selectedOption.description ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowDescription(true); }}
          className="mx-2.5 mb-2.5 cursor-pointer text-left text-[10px] font-semibold text-orange-600 hover:text-orange-800"
        >
          Läs beskrivning →
        </button>
      ) : null}

      {hasVariants ? (
        <div className="flex flex-wrap gap-1 px-2.5 pb-2.5" onClick={(e) => e.stopPropagation()}>
          {inStockOptions.length > 0 ? (
            inStockOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelectedKey(option.key); }}
                className={`max-w-full truncate rounded-full px-2 py-1 text-[10px] font-semibold transition ${
                  option.key === selectedKey
                    ? "bg-orange-500 text-white"
                    : "bg-green-100 text-green-800 hover:bg-green-200"
                }`}
              >
                {option.variantName ?? "Standard"}
              </button>
            ))
          ) : (
            <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-semibold text-red-400">
              Alla varianter slut
            </span>
          )}
        </div>
      ) : null}
    </article>
  );
}

type ProductOption = {
  key: string;
  variantName: string | null;
  price: number;
  ean: string | null;
  imageUrl: string | null;
  description: string | null;
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
      description: variant.shortDescription ?? product.shortDescription ?? null,
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
      description: product.shortDescription ?? null,
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

function formatMetaKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function formatPrice(value: number): string {
  return value.toFixed(2);
}
