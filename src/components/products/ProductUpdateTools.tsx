"use client";

import { useToast } from "@/components/ui/ToastProvider";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { flushSync } from "react-dom";

type ProductUpdateToolsProps = {
  storeId: string;
};

type SyncEvent =
  | { type: "total"; count: number }
  | { type: "progress"; processed: number; total: number }
  | { type: "done"; result: { createdProducts: number; updatedProducts: number; unchangedProducts: number } }
  | { type: "error"; message: string };

export function ProductUpdateTools({ storeId }: ProductUpdateToolsProps) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);

  async function runSync() {
    flushSync(() => {
      setBusy(true);
      setProcessed(0);
      setTotal(0);
    });

    try {
      const response = await fetch(`/api/stores/${storeId}/products/sync`, { method: "POST" });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        toast.error(data.error ?? "Något gick fel");
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) { toast.error("Kunde inte läsa svaret."); return; }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as SyncEvent;

          if (event.type === "total") {
            flushSync(() => setTotal(event.count));
          } else if (event.type === "progress") {
            flushSync(() => setProcessed(event.processed));
          } else if (event.type === "done") {
            const { createdProducts: created = 0, updatedProducts: updated = 0, unchangedProducts: unchanged = 0 } = event.result;
            if (created === 0 && updated === 0) {
              toast.info(unchanged > 0 ? `Inga ändringar. ${unchanged} produkter redan uppdaterade.` : "Inga produkter att uppdatera.");
            } else {
              const parts = [
                created > 0 ? `${created} nya` : null,
                updated > 0 ? `${updated} uppdaterade` : null,
                unchanged > 0 ? `${unchanged} oförändrade` : null,
              ].filter(Boolean);
              toast.success(`Klart: ${parts.join(", ")}.`);
            }
            router.refresh();
          } else if (event.type === "error") {
            toast.error(event.message);
          }
        }
      }
    } catch {
      toast.error("Något gick fel");
    } finally {
      flushSync(() => {
        setBusy(false);
        setProcessed(0);
        setTotal(0);
      });
    }
  }

  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
  const left = total - processed;

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-sm">
      <button
        type="button"
        onClick={() => void runSync()}
        disabled={busy || !storeId}
        className="flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-accent px-4 text-sm font-bold text-accent-foreground shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Hämtar från WooCommerce…" : "Uppdatera produkter från WooCommerce"}
      </button>

      {busy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-blue-100 bg-white px-6 py-5 shadow-xl flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="size-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <span className="text-sm font-bold text-blue-900">Hämtar från WooCommerce</span>
            </div>
            <span className="text-sm font-semibold text-blue-800 text-center">
              {total > 0 ? `${processed} av ${total} produkter klara · ${left} kvar` : "Förbereder…"}
            </span>
            <div className="w-full overflow-hidden rounded-full bg-blue-100 h-3">
              <div
                className="h-3 rounded-full bg-blue-500 transition-all duration-150"
                style={{ width: total > 0 ? `${percent}%` : "0%" }}
              />
            </div>
            {total > 0 && (
              <span className="text-xs font-semibold text-blue-500">{percent}%</span>
            )}
          </div>
        </div>
      )}

      <p className="mt-2 text-center text-xs leading-5 text-zinc-500">
        {storeId
          ? "Nya produkter läggs till, befintliga uppdateras bara om något ändrats."
          : "Välj en butik ovan för att synkronisera."}
      </p>
    </section>
  );
}
