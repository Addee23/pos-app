"use client";

import { useState } from "react";

export type PosStore = {
  id: string;
  name: string;
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
};

export function KassaClient({ store, isAdmin = false }: KassaClientProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [resultPopupOpen, setResultPopupOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const total = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  async function searchProducts(formData: FormData) {
    const nextQuery = String(formData.get("q") ?? "").trim();
    setQuery(nextQuery);
    setError(null);
    setSuccess(null);
    setSearchResults([]);
    setResultPopupOpen(false);

    if (!nextQuery) {
      setError("Skriv eller scanna en produktkod.");
      return;
    }

    setSearching(true);

    try {
      const response = await fetch(
        `/api/pos/search?q=${encodeURIComponent(nextQuery)}`,
      );

      if (!response.ok) {
        setError(await getErrorMessage(response, "Kunde inte söka produkt"));
        return;
      }

      const data = (await response.json()) as SearchResponse;

      if (data.exactMatch) {
        addSearchItem(data.exactMatch);
        setQuery("");
        setSuccess(`${displayName(data.exactMatch)} lades till i varukorgen.`);
        return;
      }

      if (data.results.length === 0) {
        setError("Ingen produkt hittades.");
        return;
      }

      setSearchResults(data.results);
      setResultPopupOpen(true);
    } catch (error) {
      console.error(error);
      setError("Något gick fel vid sökningen. Försök igen.");
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
    setError(null);
    setSuccess(null);

    if (nextItem.maxQuantity <= 0) {
      setError("Varan saknar lager och kan inte läggas till.");
      return;
    }

    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => item.cartKey === nextItem.cartKey,
      );

      if (!existing) {
        return [...currentCart, nextItem];
      }

      if (existing.quantity >= existing.maxQuantity) {
        setError("Det finns inte fler i lager.");
        return currentCart;
      }

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
    setError(null);
    setSuccess(null);
    setSearchResults([]);
    setResultPopupOpen(false);
    setSuccess("Köpet avbröts och varukorgen tömdes.");
  }

  function changeQuantity(cartKey: string, change: number) {
    setError(null);
    setSuccess(null);

    setCart((currentCart) =>
      currentCart.flatMap((item) => {
        if (item.cartKey !== cartKey) {
          return [item];
        }

        const nextQuantity = item.quantity + change;
        if (nextQuantity <= 0) {
          return [];
        }

        if (nextQuantity > item.maxQuantity) {
          setError("Det finns inte fler i lager.");
          return [item];
        }

        return [{ ...item, quantity: nextQuantity }];
      }),
    );
  }

  async function completeSale() {
    setError(null);
    setSuccess(null);

    if (cart.length === 0) {
      setError("Lägg till minst en vara innan du slutför köpet.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });

      if (!response.ok) {
        setError(await getErrorMessage(response, "Kunde inte slutföra köpet"));
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
      setSuccess("Köpet slutfördes och lagret uppdaterades.");
    } catch (error) {
      console.error(error);
      setError("Något gick fel vid anropet. Försök igen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-4">
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            POS
          </p>
          <h2 className="mt-1 text-xl font-semibold text-zinc-900">Kassa</h2>
          <p className="mt-1 text-xs font-bold text-blue-700">{store.name}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Exakt EAN eller nummer läggs direkt i varukorgen. Namn eller
            WooCommerce-länk söker fram produkten.
          </p>
        </div>

        <form
          action={searchProducts}
          className="sticky top-[73px] z-30 flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white/95 p-3 text-sm font-medium text-zinc-700 shadow-sm backdrop-blur"
        >
          <label className="flex flex-col gap-1">
            Sök eller scanna
            <input
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              placeholder="EAN, produktnamn eller WooCommerce-länk"
              autoComplete="off"
              className="min-h-12 w-full cursor-text rounded-2xl border border-zinc-200 bg-white px-3 text-base font-normal text-zinc-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
            />
          </label>
          <button
            type="submit"
            disabled={searching}
            className="min-h-11 cursor-pointer rounded-2xl bg-accent px-4 text-sm font-bold text-accent-foreground shadow-sm shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {searching ? "Söker..." : "Sök produkt"}
          </button>
        </form>
      </section>

      <CartPanel
        cart={cart}
        total={total}
        error={error}
        success={success}
        saving={saving}
        isAdmin={isAdmin}
        onChangeQuantity={changeQuantity}
        onCancelCart={cancelCart}
        onCompleteSale={completeSale}
      />

      {receipt ? <ReceiptPanel receipt={receipt} store={store} /> : null}

      {resultPopupOpen ? (
        <SearchResultPopup
          results={searchResults}
          onClose={() => setResultPopupOpen(false)}
          onAdd={(item) => {
            addSearchItem(item);
            setResultPopupOpen(false);
            setQuery("");
            setSuccess(`${displayName(item)} lades till i varukorgen.`);
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

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-zinc-950/35 px-3 pb-3 pt-10">
      <section className="max-h-[88vh] w-full max-w-[430px] overflow-y-auto rounded-[2rem] bg-[#f3eee5] p-4 shadow-2xl">
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
            onClick={onClose}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/80 text-sm font-bold text-zinc-500"
            aria-label="Stäng sökresultat"
          >
            x
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
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
  const hasVariants = group.options.length > 1 || selectedItem.variantId;

  return (
    <article className="rounded-[1.75rem] border border-[#dfd4c6] bg-[#f8f4ed] p-4 shadow-sm">
      <div className="grid grid-cols-[112px_1fr] gap-4">
        <ProductImageLarge
          imageUrl={selectedItem.imageUrl ?? group.imageUrl}
          name={group.productName}
        />
        <div className="min-w-0">
          <p className="text-xl font-bold leading-6 text-[#43342c]">
            {group.productName}
          </p>
          <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#75675d]">
            {selectedItem.description}
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
            {group.options.map((item) => (
              <option key={itemKey(item)} value={itemKey(item)}>
                {item.variantName ?? "Standard"} - {formatPrice(item.price)} kr
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="mt-3 grid grid-cols-[44px_1fr_44px] items-center gap-2">
        <button
          type="button"
          className="min-h-10 rounded-xl bg-orange-500 text-lg font-bold text-white opacity-60"
          aria-label="Minska antal"
          disabled
        >
          -
        </button>
        <p className="rounded-xl border border-[#d9cec0] bg-white py-2 text-center text-sm font-bold text-[#43342c]">
          1
        </p>
        <button
          type="button"
          className="min-h-10 rounded-xl bg-orange-500 text-lg font-bold text-white opacity-60"
          aria-label="Öka antal"
          disabled
        >
          +
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#dfd4c6]">
        <ProductFact label="Pris" value={`${formatPrice(selectedItem.price)} kr`} />
        <ProductFact label="Lager" value={`${selectedItem.stockQuantity} st`} />
        <ProductFact label="EAN" value={selectedItem.ean ?? "-"} />
        <ProductFact label="Lagerplats" value={selectedItem.stockLocation ?? "-"} />
      </div>

      <button
        type="button"
        onClick={() => onAdd(selectedItem)}
        disabled={selectedItem.stockQuantity <= 0}
        className="mt-4 min-h-12 w-full cursor-pointer rounded-xl bg-orange-500 px-4 text-sm font-bold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Lägg till i varukorg
      </button>
    </article>
  );
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
      <p className="max-w-36 text-right font-bold text-blue-700">{value}</p>
    </div>
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
  error,
  success,
  saving,
  isAdmin,
  onChangeQuantity,
  onCancelCart,
  onCompleteSale,
}: {
  cart: CartItem[];
  total: number;
  error: string | null;
  success: string | null;
  saving: boolean;
  isAdmin: boolean;
  onChangeQuantity: (cartKey: string, change: number) => void;
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
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {item.variantName ?? "Enkel produkt"}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px] font-semibold text-zinc-500">
                      <span className="rounded-full bg-zinc-100 px-2 py-1">
                        EAN {item.ean ?? "-"}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2 py-1">
                        Plats {item.stockLocation ?? "-"}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">
                      {item.description}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-zinc-900">
                    {formatPrice(item.unitPrice * item.quantity)} kr
                  </p>
                </div>

                <div className="mt-2 grid grid-cols-[44px_1fr_44px] items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onChangeQuantity(item.cartKey, -1)}
                    className="min-h-10 cursor-pointer rounded-xl border border-zinc-200 text-lg font-semibold"
                  >
                    -
                  </button>
                  <p className="text-center text-sm font-semibold text-zinc-900">
                    {item.quantity} st
                  </p>
                  <button
                    type="button"
                    onClick={() => onChangeQuantity(item.cartKey, 1)}
                    className="min-h-10 cursor-pointer rounded-xl border border-zinc-200 text-lg font-semibold"
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

        {error ? <Alert type="error" message={error} /> : null}
        {success ? <Alert type="success" message={success} /> : null}

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

function Alert({
  type,
  message,
}: {
  type: "error" | "success";
  message: string;
}) {
  const styles =
    type === "error"
      ? "mt-3 bg-red-50 text-red-700"
      : "mt-3 bg-emerald-50 text-emerald-700";
  return <p className={`rounded-2xl px-3 py-2 text-sm ${styles}`}>{message}</p>;
}

function ReceiptPanel({
  receipt,
  store,
}: {
  receipt: Receipt;
  store: PosStore;
}) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
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

      <div className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-900">
        <div className="text-center">
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
          <p className="mt-2 whitespace-pre-line text-center text-xs text-zinc-500">
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
