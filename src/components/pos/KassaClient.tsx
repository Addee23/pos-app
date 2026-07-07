"use client";

import { useToast } from "@/components/ui/ToastProvider";
import {
  ReceiptStoreLogo,
  resolveReceiptLogoUrl,
} from "@/components/pos/ReceiptStoreLogo";
import { useEffect, useState, type CSSProperties } from "react";

export type PosStore = {
  id: string;
  name: string;
  logoUrl: string | null;
  address: string | null;
  receiptFooter: string | null;
  returnText: string | null;
  thankYouMessage: string | null;
  socialLinks: string | null;
  receiptWidthMm: number;
};

type SearchItem = {
  type: "product" | "variant";
  productId: string;
  variantId: string | null;
  wooProductId: number;
  wooVariantId: number | null;
  productName: string;
  variantName: string | null;
  ean: string | null;
  price: number;
  stockQuantity: number;
  stockLocation: string | null;
  description: string;
  imageUrl: string | null;
};

type SearchResponse = {
  mode: "number" | "name" | "url";
  exactMatch: SearchItem | null;
  results: SearchItem[];
};

type CartItem = {
  cartKey: string;
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  ean: string | null;
  imageUrl: string | null;
  description: string;
  stockLocation: string | null;
  unitPrice: number;
  quantity: number;
  maxQuantity: number;
};

type Receipt = {
  saleId: string;
  createdAt: string;
  total: number;
  items: CartItem[];
};

type SaleResponse = {
  id: string;
  createdAt: string;
  total: string | number;
};

type KassaClientProps = {
  store: PosStore;
  isAdmin?: boolean;
  allStores?: { id: string; name: string }[];
};

export function KassaClient({ store, isAdmin = false, allStores }: KassaClientProps) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [resultPopupOpen, setResultPopupOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [saving, setSaving] = useState(false);
  const [browseProducts, setBrowseProducts] = useState<GroupedSearchProduct[]>([]);
  const [browsePage, setBrowsePage] = useState(1);
  const [browseHasMore, setBrowseHasMore] = useState(false);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseTotal, setBrowseTotal] = useState(0);

  const total = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  async function loadBrowse(page: number, reset: boolean) {
    setBrowseLoading(true);
    try {
      const res = await fetch(
        `/api/pos/products?storeId=${encodeURIComponent(store.id)}&page=${page}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { items: SearchItem[]; hasMore: boolean; total: number };
      const groups = groupSearchResults(data.items);
      setBrowseProducts((prev) => (reset ? groups : [...prev, ...groups]));
      setBrowseHasMore(data.hasMore);
      setBrowseTotal(data.total);
      setBrowsePage(page);
    } catch {
      /* ignore */
    } finally {
      setBrowseLoading(false);
    }
  }

  useEffect(() => {
    void loadBrowse(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.id]);

  async function searchProducts(formData: FormData) {
    const nextQuery = String(formData.get("q") ?? "").trim();
    setQuery(nextQuery);
    setSearchResults([]);
    setResultPopupOpen(false);

    if (!nextQuery) {
      toast.error("Skriv eller scanna en produktkod.");
      return;
    }

    setSearching(true);

    try {
      const response = await fetch(
        `/api/pos/search?q=${encodeURIComponent(nextQuery)}&storeId=${encodeURIComponent(store.id)}`,
      );

      if (!response.ok) {
        toast.error(await getErrorMessage(response, "Kunde inte söka produkt"));
        return;
      }

      const data = (await response.json()) as SearchResponse;

      if (data.exactMatch) {
        addSearchItem(data.exactMatch);
        setQuery("");
        toast.success(`${displayName(data.exactMatch)} lades till i varukorgen.`);
        return;
      }

      if (data.results.length === 0) {
        toast.error("Ingen produkt hittades.");
        return;
      }

      setSearchResults(data.results);
      setResultPopupOpen(true);
    } catch (error) {
      console.error(error);
      toast.error("Något gick fel vid sökningen. Försök igen.");
    } finally {
      setSearching(false);
    }
  }

  function addSearchItem(item: SearchItem) {
    addToCart({
      cartKey: item.variantId ? `variant:${item.variantId}` : `product:${item.productId}`,
      productId: item.productId,
      variantId: item.variantId,
      name: item.productName,
      variantName: item.variantName,
      ean: item.ean,
      imageUrl: item.imageUrl,
      description: item.description,
      stockLocation: item.stockLocation,
      unitPrice: item.price,
      quantity: 1,
      maxQuantity: item.stockQuantity,
    });
  }

  function addToCart(nextItem: CartItem) {
    if (nextItem.maxQuantity <= 0) {
      toast.error("Varan saknar lager och kan inte läggas till.");
      return;
    }

    const existing = cart.find((item) => item.cartKey === nextItem.cartKey);
    if (existing && existing.quantity >= existing.maxQuantity) {
      toast.error("Det finns inte fler i lager.");
      return;
    }

    setCart((currentCart) => {
      const found = currentCart.find((item) => item.cartKey === nextItem.cartKey);
      if (!found) return [...currentCart, nextItem];
      return currentCart.map((item) =>
        item.cartKey === nextItem.cartKey
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );
    });
  }

  function cancelCart() {
    if (cart.length === 0) {
      return;
    }

    const shouldCancel = window.confirm(
      "Avbryt köpet? Alla varor tas bort från varukorgen.",
    );

    if (!shouldCancel) {
      return;
    }

    setCart([]);
    setSearchResults([]);
    setResultPopupOpen(false);
    toast.success("Köpet avbröts och varukorgen tömdes.");
  }

  function changeQuantity(cartKey: string, change: number) {
    const item = cart.find((i) => i.cartKey === cartKey);
    if (item) {
      const next = item.quantity + change;
      if (next > item.maxQuantity) {
        toast.error(`Bara ${item.maxQuantity} st i lager för "${item.name}".`);
        return;
      }
    }
    setCart((currentCart) =>
      currentCart.flatMap((i) => {
        if (i.cartKey !== cartKey) return [i];
        const next = i.quantity + change;
        if (next <= 0) return [];
        return [{ ...i, quantity: next }];
      }),
    );
  }

  function setExactQuantity(cartKey: string, value: number, notify = false) {
    if (notify) {
      const item = cart.find((i) => i.cartKey === cartKey);
      if (item && value > item.maxQuantity) {
        toast.error(`Bara ${item.maxQuantity} st i lager för "${item.name}".`);
      }
    }
    setCart((currentCart) =>
      currentCart.flatMap((item) => {
        if (item.cartKey !== cartKey) return [item];
        if (value <= 0) return [];
        return [{ ...item, quantity: Math.min(value, item.maxQuantity) }];
      }),
    );
  }

  async function completeSale() {
    if (cart.length === 0) {
      toast.error("Lägg till minst en vara innan du slutför köpet.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
          items: cart.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });

      if (!response.ok) {
        toast.error(await getErrorMessage(response, "Kunde inte slutföra köpet"));
        return;
      }

      const sale = (await response.json()) as SaleResponse;

      setReceipt({
        saleId: sale.id,
        createdAt: sale.createdAt,
        total: Number(sale.total),
        items: cart,
      });
      setCart([]);
      setQuery("");
      setSearchResults([]);
      setResultPopupOpen(false);
      toast.success("Köpet slutfördes och lagret uppdaterades.");
      void loadBrowse(1, true);
    } catch (error) {
      console.error(error);
      toast.error("Något gick fel vid anropet. Försök igen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-start lg:gap-6">
      <section className="flex flex-col gap-4">
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">POS</p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-900">Kassa</h2>
              <p className="mt-1 text-xs font-bold text-blue-700">{store.name}</p>
            </div>
            {isAdmin && allStores && allStores.length > 1 ? (
              <select
                value={store.id}
                onChange={(e) => { window.location.href = `/kassa?storeId=${e.target.value}`; }}
                className="min-h-9 cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 px-2 text-xs font-semibold text-zinc-700 outline-none focus:border-blue-300"
              >
                {allStores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : null}
          </div>
        </div>

        <form
          action={searchProducts}
          className="sticky top-18.25 z-30 flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white/95 p-3 text-sm font-medium text-zinc-700 shadow-sm backdrop-blur"
        >
          <label htmlFor="kassa-search" className="flex flex-col gap-1">
            Sök eller scanna
            <input
              id="kassa-search"
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              placeholder="EAN, produktnamn eller WooCommerce-länk"
              autoComplete="off"
              aria-describedby="kassa-search-hint"
              className="min-h-12 w-full cursor-text rounded-2xl border border-zinc-200 bg-white px-3 text-base font-normal text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
            />
            <span id="kassa-search-hint" className="text-xs font-normal leading-5 text-zinc-500">
              Skanna streckkod eller skriv produktnamn. Klistra in Woo-länk för att hitta via URL.
            </span>
          </label>
          <button
            type="submit"
            disabled={searching}
            className="min-h-11 cursor-pointer rounded-2xl bg-accent px-4 text-sm font-bold text-accent-foreground shadow-sm shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {searching ? "Söker..." : "Sök produkt"}
          </button>
        </form>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-zinc-400">
            Produkter i lager{browseTotal > 0 ? ` (${browseTotal})` : ""}
          </p>

          {browseLoading && browseProducts.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">Laddar produkter...</p>
          ) : browseProducts.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">Inga produkter i lager.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                {browseProducts.map((group) => (
                  <SearchProductCard
                    key={group.productId}
                    group={group}
                    onAdd={(item) => {
                      addSearchItem(item);
                      toast.success(`${displayName(item)} lades till i varukorgen.`);
                    }}
                  />
                ))}
              </div>
              {browseHasMore ? (
                <button
                  type="button"
                  onClick={() => void loadBrowse(browsePage + 1, false)}
                  disabled={browseLoading}
                  className="min-h-11 w-full cursor-pointer rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 shadow-sm transition hover:border-orange-300 hover:text-orange-700 disabled:opacity-60"
                >
                  {browseLoading ? "Laddar..." : "Ladda mer"}
                </button>
              ) : null}
            </>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-4 lg:sticky lg:top-24">
      <CartPanel
        cart={cart}
        total={total}
        saving={saving}
        isAdmin={isAdmin}
        onChangeQuantity={changeQuantity}
        onSetQuantity={setExactQuantity}
        onCancelCart={cancelCart}
        onCompleteSale={completeSale}
      />

      {receipt ? <ReceiptPanel receipt={receipt} store={store} /> : null}
      </div>

      {resultPopupOpen ? (
        <SearchResultPopup
          results={searchResults}
          onClose={() => setResultPopupOpen(false)}
          onAdd={(item) => {
            addSearchItem(item);
            setResultPopupOpen(false);
            setQuery("");
            toast.success(`${displayName(item)} lades till i varukorgen.`);
          }}
        />
      ) : null}
    </div>
  );
}

function SearchResultPopup({
  results,
  onClose,
  onAdd,
}: {
  results: SearchItem[];
  onClose: () => void;
  onAdd: (item: SearchItem) => void;
}) {
  const groupedResults = groupSearchResults(results);
  const singleGroup = groupedResults.length === 1 ? groupedResults[0] : null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSectionClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (singleGroup) {
      const item = singleGroup.options[0];
      if (item.stockQuantity > 0) onAdd(item);
    }
  }

  return (
    <div className="fixed inset-0 z-90 flex items-end justify-center bg-zinc-950/35 px-3 pb-3 pt-10 lg:items-center lg:p-6" onClick={onClose}>
      <section
        className={`max-h-[88vh] w-full max-w-107.5 overflow-y-auto rounded-4xl bg-[#f3eee5] p-4 shadow-2xl lg:max-w-xl ${singleGroup ? "cursor-pointer" : ""}`}
        onClick={handleSectionClick}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
              Sökresultat
            </p>
            <h3 className="mt-1 text-lg font-bold text-[#43342c]">
              Välj produkt
            </h3>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/80 text-sm font-bold text-zinc-500"
            aria-label="Stäng sökresultat"
          >
            x
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {groupedResults.map((group) => (
            <SearchProductCard
              key={group.productId}
              group={group}
              onAdd={onAdd}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

type GroupedSearchProduct = {
  productId: string;
  productName: string;
  description: string;
  imageUrl: string | null;
  options: SearchItem[];
};

function SearchProductCard({
  group,
  onAdd,
}: {
  group: GroupedSearchProduct;
  onAdd: (item: SearchItem) => void;
}) {
  const [selectedKey, setSelectedKey] = useState(itemKey(group.options[0]));
  const selectedItem =
    group.options.find((item) => itemKey(item) === selectedKey) ??
    group.options[0];
  const hasVariants = group.options.length > 1;
  const outOfStock = selectedItem.stockQuantity <= 0;

  return (
    <article
      className={`group flex w-[calc(50%-6px)] flex-col overflow-hidden rounded-2xl shadow-sm ${
        outOfStock
          ? "border border-red-200 bg-red-50"
          : "cursor-pointer border border-[#dfd4c6] bg-[#f8f4ed] hover:border-orange-300 hover:shadow-md"
      }`}
      onClick={(e) => { e.stopPropagation(); if (!outOfStock) onAdd(selectedItem); }}
    >
      <ProductImageSquare
        imageUrl={selectedItem.imageUrl ?? group.imageUrl}
        name={group.productName}
        dimmed={outOfStock}
      />

      <div className="p-2.5">
        <p className={`line-clamp-1 text-xs font-semibold leading-4 ${outOfStock ? "text-zinc-400" : "text-[#43342c]"}`}>
          {group.productName}
        </p>
        <p className={`mt-0.5 text-sm font-bold ${outOfStock ? "text-zinc-400" : "text-orange-700"}`}>
          {formatPrice(selectedItem.price)} kr
        </p>
        <p className={`mt-0.5 text-[10px] font-semibold ${outOfStock ? "text-red-400" : "text-zinc-400"}`}>
          {outOfStock ? "Slut i lager" : `${selectedItem.stockQuantity} st i lager`}
        </p>
      </div>

      {hasVariants ? (
        <div
          className={`border-t px-2.5 pb-2.5 pt-2 ${outOfStock ? "border-zinc-200" : "border-[#dfd4c6]"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <select
            value={selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
            disabled={outOfStock}
            className="w-full cursor-pointer rounded-lg border border-[#c9bdae] bg-white px-2 py-1.5 text-xs text-[#43342c] outline-none focus:border-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {group.options.map((item) => (
              <option key={itemKey(item)} value={itemKey(item)}>
                {item.variantName ?? "Standard"} – {formatPrice(item.price)} kr
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="mt-auto px-2.5 pb-2.5">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (!outOfStock) onAdd(selectedItem); }}
          disabled={outOfStock}
          className="min-h-10 w-full cursor-pointer rounded-xl bg-orange-500 px-4 text-xs font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Lägg till i varukorg
        </button>
      </div>
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


function CartItemImage({
  imageUrl,
  name,
}: {
  imageUrl: string | null;
  name: string;
}) {
  if (!imageUrl) {
    return (
      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[10px] font-bold text-blue-700">
        Bild
      </div>
    );
  }

  return (
    <div
      aria-label={name}
      role="img"
      className="size-14 shrink-0 rounded-2xl border border-zinc-100 bg-zinc-50 bg-cover bg-center"
      style={{ backgroundImage: `url("${imageUrl}")` }}
    />
  );
}

function groupSearchResults(results: SearchItem[]): GroupedSearchProduct[] {
  const groups = new Map<string, GroupedSearchProduct>();

  for (const item of results) {
    const current = groups.get(item.productId);

    if (current) {
      current.options.push(item);
      continue;
    }

    groups.set(item.productId, {
      productId: item.productId,
      productName: item.productName,
      description: item.description,
      imageUrl: item.imageUrl,
      options: [item],
    });
  }

  return Array.from(groups.values());
}

function itemKey(item: SearchItem): string {
  return item.variantId ? `variant:${item.variantId}` : `product:${item.productId}`;
}

function CartPanel({
  cart,
  total,
  saving,
  isAdmin,
  onChangeQuantity,
  onSetQuantity,
  onCancelCart,
  onCompleteSale,
}: {
  cart: CartItem[];
  total: number;
  saving: boolean;
  isAdmin: boolean;
  onChangeQuantity: (cartKey: string, change: number) => void;
  onSetQuantity: (cartKey: string, value: number, notify?: boolean) => void;
  onCancelCart: () => void;
  onCompleteSale: () => void;
}) {
  return (
    <aside className="relative z-0">
      <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-900">Varukorg</h3>
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
            {cart.length}
          </span>
        </div>

        {cart.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-zinc-200 px-3 py-6 text-center text-sm text-zinc-500">
            Varukorgen är tom. Scanna kod eller sök produkt.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-zinc-100">
            {cart.map((item) => (
              <li key={item.cartKey} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <CartItemImage imageUrl={item.imageUrl} name={item.name} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold leading-5 text-zinc-900">
                      {item.name}
                    </p>
                    {item.variantName ? (
                      <p className="mt-0.5 text-xs text-zinc-500">{item.variantName}</p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px] font-semibold text-zinc-500">
                      <span className="rounded-full bg-zinc-100 px-2 py-1">
                        EAN {item.ean ?? "-"}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2 py-1">
                        Plats {item.stockLocation ?? "-"}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2 py-1">
                        Lager {item.maxQuantity} st
                      </span>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-zinc-900">
                    {formatPrice(item.unitPrice * item.quantity)} kr
                  </p>
                </div>

                <div className="mt-2 grid grid-cols-[36px_1fr_36px] items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChangeQuantity(item.cartKey, -1)}
                    className="min-h-9 cursor-pointer rounded-xl border border-zinc-200 text-base font-semibold transition hover:bg-zinc-50"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={item.maxQuantity}
                    value={item.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1) {
                        onSetQuantity(item.cartKey, val, true);
                      }
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10);
                      onSetQuantity(item.cartKey, isNaN(val) || val < 1 ? 1 : val, false);
                    }}
                    className="min-h-9 w-full rounded-xl border border-zinc-200 text-center text-sm font-semibold text-zinc-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => onChangeQuantity(item.cartKey, 1)}
                    className="min-h-9 cursor-pointer rounded-xl border border-zinc-200 text-base font-semibold transition hover:bg-zinc-50"
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 rounded-2xl bg-zinc-50 px-3 py-3">
          <p className="text-xs font-medium text-zinc-400">Total</p>
          <p className="mt-0.5 text-2xl font-semibold text-zinc-900">
            {formatPrice(total)} kr
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {isAdmin && cart.length > 0 ? (
            <button
              type="button"
              onClick={onCancelCart}
              disabled={saving}
              className="min-h-11 w-full cursor-pointer rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Avbryt köp
            </button>
          ) : null}
          <button
            type="button"
            onClick={onCompleteSale}
            disabled={saving || cart.length === 0}
            className="min-h-12 w-full cursor-pointer rounded-2xl bg-accent px-4 text-sm font-bold text-accent-foreground shadow-sm shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Slutför..." : "Slutför köp"}
          </button>
        </div>
      </section>
    </aside>
  );
}

function ReceiptPanel({
  receipt,
  store,
}: {
  receipt: Receipt;
  store: PosStore;
}) {
  const receiptWidthMm = store.receiptWidthMm > 0 ? store.receiptWidthMm : 80;
  const logoUrl = resolveReceiptLogoUrl(store.logoUrl);

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-4 print:border-0 print:bg-white print:p-0">
      <div className="flex items-start justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Kvitto
          </p>
          <h3 className="mt-1 text-sm font-semibold text-zinc-900">
            Senaste köp
          </h3>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-10 cursor-pointer rounded-2xl border border-zinc-300 bg-white px-3 text-sm font-medium"
        >
          Skriv ut
        </button>
      </div>

      <div
        id="receipt-print-area"
        className="receipt-paper mx-auto mt-4 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-900 print:mt-0 print:rounded-none print:bg-white print:p-0 print:text-black"
        style={
          {
            "--receipt-width-mm": String(receiptWidthMm),
          } as CSSProperties
        }
      >
        <div className="text-center">
          <ReceiptStoreLogo logoUrl={logoUrl} storeName={store.name} />
          <p className="font-semibold">{store.name}</p>
          {store.address ? (
            <p className="mt-1 whitespace-pre-line text-xs text-zinc-500">
              {store.address}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-zinc-500">
            {formatReceiptDate(receipt.createdAt)}
          </p>
        </div>

        <ul className="mt-4 flex flex-col divide-y divide-zinc-200">
          {receipt.items.map((item) => (
            <li key={item.cartKey} className="py-2 first:pt-0 last:pb-0">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-zinc-500">
                    {item.variantName ?? item.ean ?? "Enkel produkt"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {item.quantity} x {formatPrice(item.unitPrice)} kr
                  </p>
                </div>
                <p className="shrink-0 font-semibold">
                  {formatPrice(item.unitPrice * item.quantity)} kr
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-between border-t border-zinc-200 pt-3 text-base font-semibold">
          <span>Total</span>
          <span>{formatPrice(receipt.total)} kr</span>
        </div>

        {store.thankYouMessage ? (
          <p className="mt-4 text-center text-xs text-zinc-600">
            {store.thankYouMessage}
          </p>
        ) : null}
        {store.receiptFooter ? (
          <p className="mt-2 whitespace-pre-line text-center text-xs text-zinc-500">
            {store.receiptFooter}
          </p>
        ) : null}
        {store.returnText ? (
          <p className="mt-2 whitespace-pre-line text-center text-xs text-zinc-500">
            {store.returnText}
          </p>
        ) : null}
        {store.socialLinks ? (
          <p className="mt-2 whitespace-pre-line text-center text-xs text-zinc-500 print:text-black">
            {store.socialLinks}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function displayName(item: SearchItem): string {
  return item.variantName
    ? `${item.productName} - ${item.variantName}`
    : item.productName;
}

function formatPrice(value: number): string {
  return value.toFixed(2);
}

function formatReceiptDate(value: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

async function getErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}
