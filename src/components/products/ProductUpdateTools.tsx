"use client";

import { useMemo, useState } from "react";

type StoreOption = {
  id: string;
  name: string;
};

export type ProductPickOption = {
  id: string;
  name: string;
  wooProductId: number;
  storeId: string;
  storeName: string;
};

type ProductUpdateToolsProps = {
  stores: StoreOption[];
  products: ProductPickOption[];
  defaultStoreId?: string;
};

export function ProductUpdateTools({
  stores,
  products,
  defaultStoreId = "",
}: ProductUpdateToolsProps) {
  const [storeId, setStoreId] = useState(
    defaultStoreId || stores[0]?.id || "",
  );
  const [selectedProductId, setSelectedProductId] = useState(
    products[0]?.id ?? "",
  );
  const [fetchedJson, setFetchedJson] = useState("");
  const [fetchingJson, setFetchingJson] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const storeProducts = useMemo(
    () =>
      storeId
        ? products.filter((product) => product.storeId === storeId)
        : products,
    [products, storeId],
  );

  const activeProductId =
    selectedProductId &&
    storeProducts.some((product) => product.id === selectedProductId)
      ? selectedProductId
      : storeProducts[0]?.id ?? "";

  async function handleFetchProductJson() {
    if (!activeProductId) {
      setFetchError("Välj en produkt i listan.");
      return;
    }

    setFetchingJson(true);
    setFetchError(null);
    setCopied(false);

    try {
      const response = await fetch(`/api/products/${activeProductId}/woo-json`);
      const data = (await response.json()) as {
        error?: string;
        jsonText?: string;
      };

      if (!response.ok) {
        setFetchError(data.error ?? "Kunde inte hämta JSON");
        return;
      }

      setFetchedJson(data.jsonText ?? "");
    } catch {
      setFetchError("Något gick fel vid hämtning av JSON");
    } finally {
      setFetchingJson(false);
    }
  }

  async function handleCopyJson() {
    if (!fetchedJson) {
      return;
    }

    try {
      await navigator.clipboard.writeText(fetchedJson);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setFetchError("Kunde inte kopiera till urklipp");
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <h4 className="text-sm font-bold text-zinc-900">Produkt-JSON</h4>

      <label className="mt-3 flex flex-col gap-1 text-sm font-semibold text-zinc-700">
        Butik
        <select
          value={storeId}
          onChange={(event) => setStoreId(event.target.value)}
          className="min-h-11 cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 text-base font-normal text-zinc-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
        >
          <option value="">Välj butik</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 flex flex-col gap-1 text-sm font-semibold text-zinc-700">
        Produkt
        <select
          value={activeProductId}
          onChange={(event) => setSelectedProductId(event.target.value)}
          className="min-h-11 cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
        >
          <option value="">Välj produkt</option>
          {storeProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleFetchProductJson()}
          disabled={fetchingJson || !activeProductId}
          className="min-h-10 cursor-pointer rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none"
        >
          {fetchingJson ? "Hämtar..." : "Hämta JSON"}
        </button>
        <button
          type="button"
          onClick={() => void handleCopyJson()}
          disabled={!fetchedJson}
          className="min-h-10 cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? "Kopierad!" : "Kopiera JSON"}
        </button>
      </div>

      <textarea
        readOnly
        value={fetchedJson}
        rows={12}
        className="mt-3 min-h-48 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs leading-5 text-zinc-800 outline-none"
      />

      {fetchError ? (
        <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {fetchError}
        </p>
      ) : null}
    </section>
  );
}
