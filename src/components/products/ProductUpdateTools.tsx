"use client";

import { useToast } from "@/components/ui/ToastProvider";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type StoreOption = {
  id: string;
  name: string;
};

type ProductPickOption = {
  id: string;
  name: string;
  wooProductId: number;
};

type ProductUpdateToolsProps = {
  stores: StoreOption[];
  defaultStoreId?: string;
};

export function ProductUpdateTools({
  stores,
  defaultStoreId = "",
}: ProductUpdateToolsProps) {
  const router = useRouter();
  const toast = useToast();
  const [storeId, setStoreId] = useState(
    defaultStoreId || stores[0]?.id || "",
  );
  const [products, setProducts] = useState<ProductPickOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [fetchedJson, setFetchedJson] = useState("");
  const [fetchingJson, setFetchingJson] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!storeId) {
      setProducts([]);
      setSelectedProductId("");
      return;
    }

    let cancelled = false;
    setLoadingProducts(true);

    void (async () => {
      try {
        const response = await fetch(
          `/api/products?storeId=${encodeURIComponent(storeId)}`,
        );
        const data = (await response.json()) as
          | Array<{ id: string; name: string; wooProductId: number }>
          | { error?: string };

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          const message =
            !Array.isArray(data) && data.error
              ? data.error
              : "Kunde inte ladda produkter för butiken";
          setProducts([]);
          toast.error(message);
          return;
        }

        if (!Array.isArray(data)) {
          setProducts([]);
          toast.error("Kunde inte läsa produktlistan");
          return;
        }

        const options = data.map((product) => ({
          id: product.id,
          name: product.name,
          wooProductId: product.wooProductId,
        }));

        setProducts(options);
        setSelectedProductId(options[0]?.id ?? "");
      } catch {
        if (!cancelled) {
          setProducts([]);
          toast.error("Något gick fel vid laddning av produkter");
        }
      } finally {
        if (!cancelled) {
          setLoadingProducts(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storeId, toast]);

  const activeProductId = useMemo(() => {
    if (
      selectedProductId &&
      products.some((product) => product.id === selectedProductId)
    ) {
      return selectedProductId;
    }

    return products[0]?.id ?? "";
  }, [products, selectedProductId]);

  async function handleSyncProducts() {
    if (!storeId) {
      toast.error("Välj butik först.");
      return;
    }

    setSyncing(true);

    try {
      const response = await fetch(`/api/stores/${storeId}/products/sync`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        error?: string;
        createdProducts?: number;
        updatedProducts?: number;
        unchangedProducts?: number;
        createdVariants?: number;
        updatedVariants?: number;
        unchangedVariants?: number;
        fetchedFromWoo?: number;
      };

      if (!response.ok) {
        toast.error(data.error ?? "Kunde inte uppdatera produkter");
        return;
      }

      const created = data.createdProducts ?? 0;
      const updated = data.updatedProducts ?? 0;
      const unchanged = data.unchangedProducts ?? 0;

      if (created === 0 && updated === 0) {
        toast.info(
          unchanged > 0
            ? `Inga ändringar i WooCommerce. ${unchanged} produkter var redan uppdaterade.`
            : "Inga produkter hittades att uppdatera från WooCommerce.",
        );
      } else {
        const parts = [
          created > 0 ? `${created} nya` : null,
          updated > 0 ? `${updated} uppdaterade` : null,
          unchanged > 0 ? `${unchanged} oförändrade` : null,
        ].filter(Boolean);

        toast.success(`Klart: ${parts.join(", ")}.`);
      }

      router.refresh();
    } catch {
      toast.error("Något gick fel vid uppdateringen");
    } finally {
      setSyncing(false);
    }
  }

  async function handleFetchProductJson() {
    if (!activeProductId) {
      toast.error("Välj en produkt.");
      return;
    }

    setFetchingJson(true);
    setCopied(false);

    try {
      const response = await fetch(`/api/products/${activeProductId}/woo-json`);
      const data = (await response.json()) as {
        error?: string;
        jsonText?: string;
      };

      if (!response.ok) {
        toast.error(data.error ?? "Kunde inte hämta JSON");
        return;
      }

      setFetchedJson(data.jsonText ?? "");
    } catch {
      toast.error("Något gick fel vid hämtning av JSON");
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
      toast.error("Kunde inte kopiera till urklipp");
    }
  }

  const busy = syncing || fetchingJson;

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
      <div className="border-b border-zinc-100 p-3">
        <button
          type="button"
          onClick={() => void handleSyncProducts()}
          disabled={busy || !storeId}
          className="flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-accent px-4 text-sm font-bold text-accent-foreground shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {syncing ? "Uppdaterar produkter…" : "Uppdatera produkter"}
        </button>
        <p className="mt-2 text-center text-xs leading-5 text-zinc-500">
          Hämtar från WooCommerce. Nya produkter läggs till, befintliga
          uppdateras bara om något ändrats där.
        </p>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500">Butik</span>
          <select
            value={storeId}
            onChange={(event) => {
              setStoreId(event.target.value);
              setFetchedJson("");
            }}
            className="h-10 w-full cursor-pointer rounded-xl bg-zinc-100/80 px-3 text-sm text-zinc-900 outline-none focus:bg-white focus:ring-2 focus:ring-zinc-200"
          >
            <option value="">Välj butik</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
          <p className="text-xs font-semibold text-zinc-700">Hämta JSON</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Välj en produkt och hämta dess data som JSON.
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <select
              value={activeProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}
              disabled={loadingProducts || products.length === 0}
              className="h-10 min-w-0 flex-1 cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none disabled:opacity-50"
            >
              <option value="">
                {loadingProducts
                  ? "Laddar produkter…"
                  : products.length === 0
                    ? "Inga produkter i butiken"
                    : "Välj produkt"}
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleFetchProductJson()}
              disabled={busy || !activeProductId}
              className="h-10 shrink-0 cursor-pointer rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:bg-zinc-300"
            >
              {fetchingJson ? "Hämtar…" : "Hämta JSON"}
            </button>
          </div>

          {fetchedJson ? (
            <>
              <textarea
                readOnly
                value={fetchedJson}
                rows={8}
                className="mt-3 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-xs leading-5 text-zinc-700 outline-none"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyJson()}
                  className="h-9 cursor-pointer rounded-lg px-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
                >
                  {copied ? "Kopierad" : "Kopiera"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
