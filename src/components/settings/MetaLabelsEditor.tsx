"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";

type MetaLabelsEditorProps = {
  storeId: string;
};

export function MetaLabelsEditor({ storeId }: MetaLabelsEditorProps) {
  const toast = useToast();
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [fetching, setFetching] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);

  async function fetchMeta() {
    setFetching(true);
    try {
      const res = await fetch(`/api/stores/${storeId}/meta-labels`);
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Kunde inte hämta meta-nycklar");
        return;
      }
      const data = (await res.json()) as {
        availableKeys: string[];
        labels: Record<string, string>;
      };
      setAvailableKeys(data.availableKeys);
      setLabels(data.labels);
      setFetched(true);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Okänt fel";
      toast.error(`Kunde inte hämta meta: ${detail}`);
    } finally {
      setFetching(false);
    }
  }

  async function save() {
    if (saveInFlight.current) return;
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
        toast.error(data.error ?? "Kunde inte spara etiketter");
        return;
      }
      toast.success("Etiketter sparade.");
    } catch {
      toast.error("Något gick fel. Försök igen.");
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!fetched ? (
        <button
          type="button"
          onClick={() => void fetchMeta()}
          disabled={fetching}
          className="self-start h-9 cursor-pointer rounded-lg bg-zinc-900 px-4 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:bg-zinc-300"
        >
          {fetching ? "Hämtar…" : "Hämta meta"}
        </button>
      ) : (
        <>
          {availableKeys.length === 0 ? (
            <p className="text-sm text-zinc-400">
              Inga meta-nycklar hittades i databasen eller cigarr.json.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-3 px-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Nyckel i systemet
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Visningsnamn
                </span>
              </div>
              {availableKeys.map((key) => (
                <div key={key} className="grid grid-cols-2 gap-3 items-center">
                  <input
                    type="text"
                    readOnly
                    value={key}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-500 outline-none cursor-default select-all"
                  />
                  <input
                    type="text"
                    value={labels[key] ?? ""}
                    onChange={(e) =>
                      setLabels((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder={key}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder:text-zinc-400"
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setFetched(false); setAvailableKeys([]); setLabels({}); }}
              className="h-9 cursor-pointer rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-500 transition hover:bg-zinc-50"
            >
              Stäng
            </button>
            {availableKeys.length > 0 && (
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="h-9 cursor-pointer rounded-xl bg-violet-600 px-4 text-xs font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? "Sparar..." : "Spara visningsnamn"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
