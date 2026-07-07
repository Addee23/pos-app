"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";

type MetaRow = { key: string; label: string };

type MetaLabelsEditorProps = {
  storeId: string;
};

export function MetaLabelsEditor({ storeId }: MetaLabelsEditorProps) {
  const toast = useToast();
  const [rows, setRows] = useState<MetaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/stores/${storeId}/meta-labels`);
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Kunde inte hämta meta-nycklar");
        return;
      }
      const data = (await res.json()) as { labels: Record<string, string> };
      setRows(
        Object.entries(data.labels).map(([key, label]) => ({ key, label })),
      );
    } catch {
      toast.error("Kunde inte hämta meta-konfiguration");
    } finally {
      setLoading(false);
    }
  }

  function addRow() {
    setRows((prev) => [...prev, { key: "", label: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: "key" | "label", value: string) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  async function save() {
    if (saveInFlight.current) return;

    const dupes = rows
      .map((r) => r.key.trim())
      .filter((k, i, arr) => k && arr.indexOf(k) !== i);
    if (dupes.length > 0) {
      toast.error(`Dubblerade nycklar: ${dupes.join(", ")}`);
      return;
    }

    const labels: Record<string, string> = {};
    for (const { key, label } of rows) {
      const k = key.trim();
      const l = label.trim();
      if (k && l) labels[k] = l;
    }

    saveInFlight.current = true;
    setSaving(true);
    try {
      const res = await fetch(`/api/stores/${storeId}/meta-labels`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(labels),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Kunde inte spara");
        return;
      }
      toast.success("Meta-nycklar sparade.");
    } catch {
      toast.error("Något gick fel. Försök igen.");
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Laddar...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3 px-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Meta-nyckel (från Woo)
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Visningsnamn
            </span>
            <span />
          </div>
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center">
              <input
                type="text"
                value={row.key}
                onChange={(e) => updateRow(i, "key", e.target.value)}
                placeholder="t.ex. land"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder:text-zinc-400"
              />
              <input
                type="text"
                value={row.label}
                onChange={(e) => updateRow(i, "label", e.target.value)}
                placeholder="t.ex. Ursprungsland"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder:text-zinc-400"
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition hover:border-red-200 hover:text-red-500"
                aria-label="Ta bort rad"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {rows.length === 0 && (
        <p className="text-sm text-zinc-400">
          Inga meta-nycklar konfigurerade än. Lägg till en nyckel nedan.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={addRow}
          className="h-9 cursor-pointer rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
        >
          + Lägg till nyckel
        </button>
        {rows.length > 0 && (
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="h-9 cursor-pointer rounded-xl bg-violet-600 px-4 text-xs font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? "Sparar..." : "Spara"}
          </button>
        )}
      </div>
    </div>
  );
}
