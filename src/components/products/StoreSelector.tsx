"use client";

import { useRouter } from "next/navigation";

type Props = {
  stores: { id: string; name: string }[];
  storeCountMap: Record<string, number>;
  currentStoreId: string;
  currentQ: string;
};

export function StoreSelector({ stores, storeCountMap, currentStoreId, currentQ }: Props) {
  const router = useRouter();
  const grandTotal = Object.values(storeCountMap).reduce((s, n) => s + n, 0);

  function handleChange(storeId: string) {
    const params = new URLSearchParams();
    if (currentQ) params.set("q", currentQ);
    if (storeId) params.set("storeId", storeId);
    const qs = params.toString();
    router.push(qs ? `/admin/products?${qs}` : "/admin/products");
  }

  return (
    <select
      value={currentStoreId}
      onChange={(e) => handleChange(e.target.value)}
      className="h-10 w-full cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
    >
      <option value="">Alla butiker ({grandTotal})</option>
      {stores.map((store) => (
        <option key={store.id} value={store.id}>
          {store.name} ({storeCountMap[store.id] ?? 0})
        </option>
      ))}
    </select>
  );
}
