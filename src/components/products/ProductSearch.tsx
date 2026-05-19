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
    <form action={updateParams} className="flex flex-col gap-3">
      <input
        name="q"
        type="search"
        defaultValue={initialQuery}
        placeholder="Sök namn, EAN eller slug..."
        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-base outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
      />
      <div className="flex gap-2">
        <select
          name="storeId"
          defaultValue={initialStoreId}
          className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none focus:border-zinc-400"
        >
          <option value="">Alla butiker</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "..." : "Sök"}
        </button>
      </div>
    </form>
  );
}
