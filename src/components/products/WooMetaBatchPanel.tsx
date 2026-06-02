"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { generateProductMeta } from "@/lib/generate-product-meta";

type StoreOption = {
  id: string;
  name: string;
};

export type MetaBatchItem = {
  id: string;
  name: string;
  shortDescription: string | null;
  metaDescription: string | null;
  wooProductId: number;
  category: string | null;
  brand: string | null;
  country: string | null;
};

type WooMetaBatchPanelProps = {
  stores?: StoreOption[];
  defaultStoreId?: string;
  /** Låst till butik från inställningssidan – ingen extra butiksväljare. */
  lockStoreId?: string;
  /** Inbäddad i WooCommerce-kortet på inställningar. */
  embedded?: boolean;
};

export function WooMetaBatchPanel({
  stores = [],
  defaultStoreId = "",
  lockStoreId,
  embedded = false,
}: WooMetaBatchPanelProps) {
  const toast = useToast();
  const [storeId, setStoreId] = useState(
    lockStoreId ?? (defaultStoreId || stores[0]?.id || ""),
  );
  const [items, setItems] = useState<MetaBatchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lockStoreId) {
      setStoreId(lockStoreId);
      setItems([]);
    }
  }, [lockStoreId]);

  async function loadBatch() {
    if (!storeId) {
      toast.error("Välj butik.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/stores/${storeId}/products/meta-batch?limit=10`,
      );
      const data = (await response.json()) as {
        error?: string;
        items?: MetaBatchItem[];
      };

      if (!response.ok) {
        toast.error(data.error ?? "Kunde inte hämta produkter");
        return;
      }

      setItems(data.items ?? []);
    } catch {
      toast.error("Något gick fel");
    } finally {
      setLoading(false);
    }
  }

  function updateItem(id: string, patch: Partial<MetaBatchItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function generateMetaForItem(id: string) {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const generated = generateProductMeta({
          name: item.name,
          shortDescription: item.shortDescription,
          category: item.category,
          brand: item.brand,
          country: item.country,
        });

        return {
          ...item,
          metaDescription: generated.metaDescription,
          shortDescription: generated.shortDescription,
        };
      }),
    );
  }

  function generateAllMeta() {
    setItems((current) =>
      current.map((item) => {
        const generated = generateProductMeta({
          name: item.name,
          shortDescription: item.shortDescription,
          category: item.category,
          brand: item.brand,
          country: item.country,
        });

        return {
          ...item,
          metaDescription: generated.metaDescription,
          shortDescription: generated.shortDescription,
        };
      }),
    );
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  async function saveBatch() {
    if (!storeId || items.length === 0) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/stores/${storeId}/products/meta-batch/save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((item) => ({
              id: item.id,
              shortDescription: item.shortDescription,
              metaDescription: item.metaDescription,
            })),
          }),
        },
      );

      const data = (await response.json()) as {
        error?: string;
        saved?: number;
      };

      if (!response.ok) {
        toast.error(data.error ?? "Kunde inte spara");
        return;
      }

      toast.success("Sparat.");
    } catch {
      toast.error("Kunde inte spara");
    } finally {
      setSaving(false);
    }
  }

  const busy = loading || saving;

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs font-medium text-zinc-600">Produktmeta · 10 åt gången</p>
      <button
        type="button"
        onClick={() => void loadBatch()}
        disabled={busy || !storeId}
        className="h-9 cursor-pointer rounded-lg bg-zinc-100 px-3 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-200 disabled:opacity-50"
      >
        {loading ? "Hämtar…" : "Hämta produkter"}
      </button>
    </div>
  );

  const storePicker =
    !lockStoreId && stores.length > 0 ? (
      <label className="mt-3 flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-500">Butik</span>
        <select
          value={storeId}
          onChange={(event) => {
            setStoreId(event.target.value);
            setItems([]);
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
    ) : null;

  const body = (
    <>
      {embedded ? toolbar : (
        <div className="border-b border-zinc-100 px-4 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-zinc-900">Produktmeta</h4>
            {items.length > 0 ? (
              <span className="text-xs text-zinc-400">{items.length} st</span>
            ) : null}
          </div>
          {storePicker}
          <div className={storePicker ? "mt-3" : "mt-3 flex justify-end"}>
            <button
              type="button"
              onClick={() => void loadBatch()}
              disabled={busy || !storeId}
              className="h-10 cursor-pointer rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:bg-zinc-300"
            >
              {loading ? "Hämtar…" : "Hämta"}
            </button>
          </div>
        </div>
      )}

      {embedded ? storePicker : null}

      {items.length > 0 ? (
        <>
          <div className="mt-3 hidden border-y border-zinc-100 bg-zinc-50/60 md:grid md:grid-cols-2">
            <p className="border-r border-zinc-100 px-3 py-1.5 text-[11px] font-medium text-zinc-500">
              System
            </p>
            <p className="px-3 py-1.5 text-[11px] font-medium text-zinc-500">Kund</p>
          </div>

          <ul className="divide-y divide-zinc-100">
            {items.map((item, index) => (
              <li key={item.id} className={embedded ? "py-3" : "p-4"}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-0">
                  <div className="flex flex-col gap-2 md:border-r md:border-zinc-100 md:pr-3">
                    <p className="text-[11px] font-medium text-zinc-400">
                      {index + 1}. {item.name}
                    </p>
                    <Field label="Meta i systemet">
                      <textarea
                        value={item.metaDescription ?? ""}
                        onChange={(event) =>
                          updateItem(item.id, {
                            metaDescription: event.target.value,
                          })
                        }
                        rows={2}
                        className={textareaClass}
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={() => generateMetaForItem(item.id)}
                      disabled={busy}
                      className="h-8 w-fit cursor-pointer rounded-lg bg-zinc-100 px-2.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
                    >
                      Generera
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 md:pl-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label="Ta bort från listan"
                        className="cursor-pointer text-[11px] font-medium text-zinc-400 hover:text-red-600"
                      >
                        Ta bort
                      </button>
                    </div>
                    <Field label="Meta till kund">
                      <textarea
                        value={item.shortDescription ?? ""}
                        onChange={(event) =>
                          updateItem(item.id, {
                            shortDescription: event.target.value,
                          })
                        }
                        rows={4}
                        placeholder="Kort beskrivning som kunden ser i upphämtningsmail…"
                        aria-describedby={`meta-hint-${item.id}`}
                        className={textareaClass}
                      />
                      <span
                        id={`meta-hint-${item.id}`}
                        className="text-[11px] font-normal leading-5 text-zinc-400"
                      >
                        Visas för kunden i mailet när ordern är redo för upphämtning.
                      </span>
                    </Field>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3">
            <button
              type="button"
              onClick={generateAllMeta}
              disabled={busy}
              className="h-8 cursor-pointer rounded-lg px-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
            >
              Generera alla
            </button>
            <button
              type="button"
              onClick={() => void saveBatch()}
              disabled={busy}
              className="h-8 cursor-pointer rounded-lg bg-accent px-4 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? "Sparar…" : "Spara"}
            </button>
          </div>
        </>
      ) : embedded ? (
        <p className="mt-2 text-center text-xs text-zinc-400">
          Hämta produkter för att redigera meta.
        </p>
      ) : (
        <p className="px-4 py-10 text-center text-sm text-zinc-400">
          Välj butik och hämta produkter.
        </p>
      )}
    </>
  );

  if (embedded) {
    return <div>{body}</div>;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
      {body}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

const textareaClass =
  "w-full resize-y rounded-xl border-0 bg-zinc-100/80 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:bg-white focus:ring-2 focus:ring-zinc-200";
