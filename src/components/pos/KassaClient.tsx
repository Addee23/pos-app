"use client";

import { useMemo, useState } from "react";

export type PosVariant = {
  id: string;
  name: string;
  ean: string | null;
  price: number;
  stockQuantity: number;
  stockLocation: string | null;
};

export type PosProduct = {
  id: string;
  name: string;
  ean: string | null;
  price: number;
  stockQuantity: number;
  stockLocation: string | null;
  productType: "SIMPLE" | "VARIABLE";
  variants: PosVariant[];
};

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

type CartItem = {
  cartKey: string;
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  ean: string | null;
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
  products: PosProduct[];
  store: PosStore;
};

export function KassaClient({ products, store }: KassaClientProps) {
  const [availableProducts, setAvailableProducts] = useState(products);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return availableProducts;
    }

    return availableProducts.filter((product) => {
      const productMatch =
        product.name.toLowerCase().includes(term) ||
        product.ean?.toLowerCase().includes(term);

      const variantMatch = product.variants.some(
        (variant) =>
          variant.name.toLowerCase().includes(term) ||
          variant.ean?.toLowerCase().includes(term),
      );

      return productMatch || variantMatch;
    });
  }, [availableProducts, query]);

  const total = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  function addProduct(product: PosProduct) {
    addToCart({
      cartKey: `product:${product.id}`,
      productId: product.id,
      variantId: null,
      name: product.name,
      variantName: null,
      ean: product.ean,
      unitPrice: product.price,
      quantity: 1,
      maxQuantity: product.stockQuantity,
    });
  }

  function addVariant(product: PosProduct, variant: PosVariant) {
    addToCart({
      cartKey: `variant:${variant.id}`,
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      variantName: variant.name,
      ean: variant.ean,
      unitPrice: variant.price,
      quantity: 1,
      maxQuantity: variant.stockQuantity,
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

      // Här stoppar vi användaren från att lägga fler i kassan än vad lagret visar.
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

      // Databasen är redan uppdaterad här. Nu speglar vi samma lagerändring i UI:t direkt.
      setAvailableProducts((currentProducts) =>
        currentProducts.map((product) => {
          const simpleCartItem = cart.find(
            (item) => item.productId === product.id && !item.variantId,
          );

          if (simpleCartItem) {
            return {
              ...product,
              stockQuantity: product.stockQuantity - simpleCartItem.quantity,
            };
          }

          return {
            ...product,
            variants: product.variants.map((variant) => {
              const variantCartItem = cart.find(
                (item) => item.variantId === variant.id,
              );

              if (!variantCartItem) {
                return variant;
              }

              return {
                ...variant,
                stockQuantity: variant.stockQuantity - variantCartItem.quantity,
              };
            }),
          };
        }),
      );

      // Vi sparar en kopia av varukorgen innan den töms, så kvittot kan visas direkt.
      setReceipt({
        saleId: sale.id,
        createdAt: sale.createdAt,
        total: Number(sale.total),
        items: cart,
      });
      setCart([]);
      setQuery("");
      setSuccess("Köpet slutfördes och lagret uppdaterades.");
    } catch (error) {
      console.error(error);
      setError("Något gick fel vid anropet. Försök igen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="flex flex-col gap-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            POS
          </p>
          <h2 className="mt-1 text-xl font-semibold text-zinc-900">Kassa</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Sök på namn eller EAN, välj eventuell variant och slutför köpet när
            varukorgen stämmer.
          </p>
        </div>

        <label className="sticky top-[73px] z-30 flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white/95 p-3 text-sm font-medium text-zinc-700 shadow-sm backdrop-blur">
          Sök i kassan
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
            placeholder="Namn, EAN eller variant"
            autoComplete="off"
            className="min-h-12 w-full cursor-text rounded-lg border border-zinc-200 bg-white px-3 text-base font-normal text-zinc-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
          />
        </label>

        <ProductResultList
          products={filteredProducts}
          onAddProduct={addProduct}
          onAddVariant={addVariant}
        />
      </section>

      <CartPanel
        cart={cart}
        total={total}
        error={error}
        success={success}
        saving={saving}
        onChangeQuantity={changeQuantity}
        onCompleteSale={completeSale}
      />

      {receipt ? <ReceiptPanel receipt={receipt} store={store} /> : null}
    </div>
  );
}

function ProductResultList({
  products,
  onAddProduct,
  onAddVariant,
}: {
  products: PosProduct[];
  onAddProduct: (product: PosProduct) => void;
  onAddVariant: (product: PosProduct, variant: PosVariant) => void;
}) {
  if (products.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
        Inga produkter hittades. Prova att söka på produktnamn, EAN eller
        variant.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddProduct={onAddProduct}
          onAddVariant={onAddVariant}
        />
      ))}
    </div>
  );
}

function ProductCard({
  product,
  onAddProduct,
  onAddVariant,
}: {
  product: PosProduct;
  onAddProduct: (product: PosProduct) => void;
  onAddVariant: (product: PosProduct, variant: PosVariant) => void;
}) {
  const hasVariants = product.variants.length > 0;

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-zinc-900">
            {product.name}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {hasVariants ? "Välj variant" : product.ean ?? "EAN saknas"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
          {hasVariants ? "Varianter" : `${product.stockQuantity} st`}
        </span>
      </div>

      {!hasVariants ? (
        <button
          type="button"
          onClick={() => onAddProduct(product)}
          disabled={product.stockQuantity <= 0}
          className="mt-3 min-h-11 w-full cursor-pointer rounded-lg bg-accent px-3 text-sm font-semibold text-accent-foreground shadow-sm shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Lägg till {formatPrice(product.price)} kr
        </button>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {product.variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              onClick={() => onAddVariant(product, variant)}
              disabled={variant.stockQuantity <= 0}
              className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="min-w-0">
                <span className="block font-semibold text-zinc-900">
                  {variant.name}
                </span>
                <span className="block truncate text-xs text-zinc-500">
                  EAN {variant.ean ?? "-"} · Lager {variant.stockQuantity}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-semibold text-zinc-900">
                  {formatPrice(variant.price)} kr
                </span>
                <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                  Lägg till
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function CartPanel({
  cart,
  total,
  error,
  success,
  saving,
  onChangeQuantity,
  onCompleteSale,
}: {
  cart: CartItem[];
  total: number;
  error: string | null;
  success: string | null;
  saving: boolean;
  onChangeQuantity: (cartKey: string, change: number) => void;
  onCompleteSale: () => void;
}) {
  return (
    <aside className="lg:sticky lg:top-4 lg:self-start">
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-900">Varukorg</h3>
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
            {cart.length}
          </span>
        </div>

        {cart.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-zinc-200 px-3 py-6 text-center text-sm text-zinc-500">
            Varukorgen är tom. Sök fram en produkt och tryck på Lägg till.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-zinc-100">
            {cart.map((item) => (
              <li key={item.cartKey} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {item.variantName ?? item.ean ?? "Enkel produkt"}
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
                    className="min-h-10 cursor-pointer rounded-lg border border-zinc-200 text-lg font-semibold"
                  >
                    -
                  </button>
                  <p className="text-center text-sm font-semibold text-zinc-900">
                    {item.quantity} st
                  </p>
                  <button
                    type="button"
                    onClick={() => onChangeQuantity(item.cartKey, 1)}
                    className="min-h-10 cursor-pointer rounded-lg border border-zinc-200 text-lg font-semibold"
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 rounded-lg bg-zinc-50 px-3 py-3">
          <p className="text-xs font-medium text-zinc-400">Total</p>
          <p className="mt-0.5 text-2xl font-semibold text-zinc-900">
            {formatPrice(total)} kr
          </p>
        </div>

        {error ? <Alert type="error" message={error} /> : null}
        {success ? <Alert type="success" message={success} /> : null}

        <button
          type="button"
          onClick={onCompleteSale}
          disabled={saving || cart.length === 0}
          className="mt-4 min-h-12 w-full cursor-pointer rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Slutför..." : "Slutför köp"}
        </button>
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
  return <p className={`rounded-lg px-3 py-2 text-sm ${styles}`}>{message}</p>;
}

function ReceiptPanel({
  receipt,
  store,
}: {
  receipt: Receipt;
  store: PosStore;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 lg:col-start-2">
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
          className="min-h-10 cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium"
        >
          Skriv ut
        </button>
      </div>

      <div className="mt-4 rounded-lg bg-zinc-50 p-4 text-sm text-zinc-900">
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
