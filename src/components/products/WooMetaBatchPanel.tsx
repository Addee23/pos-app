"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import {
  WOO_META_FIELD_SUGGESTIONS,
  type WooMetaPreviewRow,
} from "@/lib/woo-meta-preview";

type StoreOption = {
  id: string;
  name: string;
};

type WooMetaBatchPanelProps = {
  stores?: StoreOption[];
  defaultStoreId?: string;
  lockStoreId?: string;
  lockStoreName?: string;
  embedded?: boolean;
};

export function WooMetaBatchPanel({
  stores = [],
  defaultStoreId = "",
  lockStoreId,
  lockStoreName,
  embedded = false,
}: WooMetaBatchPanelProps) {
  const toast = useToast();
  const [storeId, setStoreId] = useState(
    lockStoreId ?? (defaultStoreId || stores[0]?.id || ""),
  );
  const [fieldInput, setFieldInput] = useState("land");
  const [fieldError, setFieldError] = useState("");
  const [rows, setRows] = useState<WooMetaPreviewRow[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [productsWithMetadata, setProductsWithMetadata] = useState(0);
  const [activeField, setActiveField] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lockStoreId) {
      setStoreId(lockStoreId);
      setRows([]);
      setLoaded(false);
    }
  }, [lockStoreId]);

  function selectFieldSuggestion(input: string) {
    setFieldInput(input);
    setFieldError("");
    setRows([]);
    setLoaded(false);
  }

  async function loadPreview() {
    if (!storeId) {
      toast.error("Välj butik.");
      return;
    }

    const field = fieldInput.trim();
    if (!field) {
      setFieldError("Skriv vilket JSON-fält du vill söka på.");
      return;
    }

    setFieldError("");
    setLoading(true);

    try {
      const response = await fetch(
        `/api/stores/${storeId}/products/meta-batch?field=${encodeURIComponent(field)}`,
      );
      const raw = await response.text();
      let data: {
        error?: string;
        rows?: WooMetaPreviewRow[];
        productCount?: number;
        productsWithMetadata?: number;
        field?: string;
      } = {};

      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        toast.error(
          response.ok
            ? "Ogiltigt svar från servern"
            : "Serverfel – prova att starta om dev-servern (npm run dev)",
        );
        return;
      }

      if (!response.ok) {
        toast.error(data.error ?? "Kunde inte hämta meta");
        return;
      }

      setRows(data.rows ?? []);
      setProductCount(data.productCount ?? 0);
      setProductsWithMetadata(data.productsWithMetadata ?? 0);
      setActiveField(data.field ?? field);
      setLoaded(true);

      if ((data.productsWithMetadata ?? 0) === 0) {
        toast.error(
          "Ingen sparad produktmeta ännu. Kör Uppdatera produkter efter Woo-koppling.",
        );
        return;
      }

      if ((data.rows ?? []).length === 0) {
        toast.error("Inga träffar för det fältet.");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Något gick fel";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const controls = (
    <div className="flex flex-col gap-3">
      {lockStoreId && lockStoreName ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
          <p className="text-[11px] font-medium text-zinc-500">Butik</p>
          <p className="text-sm font-semibold text-zinc-900">{lockStoreName}</p>
          <p className="mt-0.5 text-[11px] leading-5 text-zinc-400">
            Byt butik med listan <strong>Välj butik</strong> högst upp på sidan.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500">
            Sök sparad produktmeta efter fält
          </span>
          <input
            type="text"
            value={fieldInput}
            onChange={(event) => {
              setFieldInput(event.target.value);
              setFieldError("");
              setRows([]);
              setLoaded(false);
            }}
            placeholder="t.ex. land, format, smak, roktid"
            className="h-10 w-full rounded-xl bg-zinc-100/80 px-3 text-sm text-zinc-900 outline-none transition focus:bg-white focus:ring-2 focus:ring-zinc-200"
          />
          {fieldError ? (
            <span className="text-[11px] font-medium text-red-600">{fieldError}</span>
          ) : null}
        </label>

        <div className="flex flex-wrap gap-2">
          {WOO_META_FIELD_SUGGESTIONS.map((suggestion) => {
            const active = fieldInput.trim().toLowerCase() === suggestion.input;

            return (
              <button
                key={suggestion.input}
                type="button"
                onClick={() => selectFieldSuggestion(suggestion.input)}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {suggestion.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-zinc-600">
          {loaded
            ? `${rows.length} grupp${rows.length === 1 ? "" : "er"} · ${productCount} produkter`
            : "Förhandsvisning av meta"}
        </p>
        <button
          type="button"
          onClick={() => void loadPreview()}
          disabled={loading || !storeId}
          className="h-9 cursor-pointer rounded-lg bg-zinc-900 px-3 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:bg-zinc-300"
        >
          {loading ? "Hämtar…" : "Hämta meta"}
        </button>
      </div>

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
            setRows([]);
            setLoaded(false);
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
      {embedded ? (
        controls
      ) : (
        <div className="border-b border-zinc-100 px-4 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-zinc-900">Produktmeta</h4>
            {loaded ? (
              <span className="text-xs text-zinc-400">{rows.length} st</span>
            ) : null}
          </div>
          {storePicker}
          <div className="mt-3">{controls}</div>
        </div>
      )}

      {embedded ? storePicker : null}

      {rows.length > 0 ? (
        <>
          <div className="mt-3 hidden border-y border-zinc-100 bg-zinc-50/60 md:grid md:grid-cols-2">
            <p className="border-r border-zinc-100 px-3 py-1.5 text-[11px] font-medium text-zinc-500">
              Systemvy
            </p>
            <p className="px-3 py-1.5 text-[11px] font-medium text-zinc-500">UX-vy</p>
          </div>

          <ul className="divide-y divide-zinc-100">
            {rows.map((row, index) => (
              <li key={row.key} className={embedded ? "py-3" : "p-4"}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-0">
                  <div className="flex flex-col gap-2 md:border-r md:border-zinc-100 md:pr-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-medium text-zinc-400">
                        {index + 1}. {row.label}
                      </p>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                        {row.productCount} prod.
                      </span>
                      {row.mixedSystemMeta ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          varierande system-meta
                        </span>
                      ) : null}
                    </div>
                    <ReadOnlyField
                      label="System (SEO / metaDescription)"
                      value={row.systemMeta}
                      emptyText="Ingen SEO-meta sparad."
                    />
                  </div>

                  <div className="flex flex-col gap-2 md:pl-3">
                    <div className="flex flex-wrap items-center gap-2 md:min-h-5">
                      {row.mixedUxMeta ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          varierande UX-meta
                        </span>
                      ) : null}
                    </div>
                    <ReadOnlyField
                      label={`UX (${activeField || "produktmeta"})`}
                      value={row.uxMeta}
                      emptyText="Ingen UX-meta för det här fältet."
                    />
                    {row.sampleProductName ? (
                      <span className="text-[11px] leading-5 text-zinc-400">
                        Exempelprodukt: {row.sampleProductName}
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : loaded ? (
        <p className="mt-2 text-center text-xs text-zinc-400">
          Inga träffar för fältet ”{activeField}”.
        </p>
      ) : embedded ? (
        <p className="mt-2 text-center text-xs text-zinc-400">
          Skriv ett JSON-fält och klicka Hämta meta för att förhandsgranska.
        </p>
      ) : (
        <p className="px-4 py-10 text-center text-sm text-zinc-400">
          Välj butik, skriv JSON-fält och hämta meta.
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

function ReadOnlyField({
  label,
  value,
  emptyText,
}: {
  label: string;
  value: string | null;
  emptyText: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-zinc-500">{label}</span>
      <div className="min-h-20 rounded-xl bg-zinc-100/80 px-3 py-2 text-sm leading-6 text-zinc-800">
        {value?.trim() ? value : (
          <span className="text-zinc-400">{emptyText}</span>
        )}
      </div>
    </div>
  );
}
