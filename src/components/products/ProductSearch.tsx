"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type StoreOption = {
  id: string;
  name: string;
};

type ProductSearchProps = {
  stores: StoreOption[];
  initialQuery?: string;
  initialStoreId?: string;
};

export function ProductSearch({
  stores,
  initialQuery = "",
  initialStoreId = "",
}: ProductSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function updateParams(formData: FormData) {
    const q = (formData.get("q") as string).trim();
    const storeId = formData.get("storeId") as string;
    const params = new URLSearchParams(searchParams.toString());

    if (q) {
      params.set("q", q);
    } else {
      params.delete("q");
    }

    if (storeId) {
      params.set("storeId", storeId);
    } else {
      params.delete("storeId");
    }

    startTransition(() => {
      router.push(`/admin/products?${params.toString()}`);
    });
  }

  return (
    <form
      action={updateParams}
      className="sticky top-[73px] z-30 flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white/95 p-3 shadow-sm backdrop-blur"
    >
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
        Sök produkt
        <input
          name="q"
          type="search"
          defaultValue={initialQuery}
          placeholder="Namn, EAN eller slug"
          className="min-h-12 w-full cursor-text rounded-lg border border-zinc-200 bg-white px-3 text-base font-normal text-zinc-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
        />
      </label>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-zinc-700">
          Butik
          <select
            name="storeId"
            defaultValue={initialStoreId}
            className="min-h-12 min-w-0 cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 text-base font-normal text-zinc-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
          >
            <option value="">Alla butiker</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="mt-6 min-h-12 cursor-pointer rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Söker..." : "Sök produkter"}
        </button>
      </div>
    </form>
  );
}
