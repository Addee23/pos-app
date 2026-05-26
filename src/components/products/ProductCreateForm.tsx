"use client";

import Link from "next/link";
import { TaxonomyFields } from "@/components/products/TaxonomyFields";
import { useRouter } from "next/navigation";
import { useState } from "react";

type StoreOption = {
  id: string;
  name: string;
};

type ProductCreateFormProps = {
  stores: StoreOption[];
  defaultStoreId?: string;
};

export function ProductCreateForm({
  stores,
  defaultStoreId = "",
}: ProductCreateFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function createProduct(formData: FormData) {
    setCreating(true);
    setError(null);

    const body = {
      storeId: formData.get("storeId"),
      name: formData.get("name"),
      price: formData.get("price"),
      ean: formData.get("ean"),
      stockQuantity: formData.get("stockQuantity"),
      stockLocation: formData.get("stockLocation"),
      shortDescription: formData.get("shortDescription"),
      category: formData.get("category"),
      brand: formData.get("brand"),
      country: formData.get("country"),
    };

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as { error?: string; id?: string };

      if (!response.ok) {
        setError(data.error ?? "Kunde inte skapa produkten");
        return;
      }

      if (data.id) {
        router.push(`/admin/products/${data.id}`);
        router.refresh();
      }
    } catch {
      setError("Något gick fel. Försök igen.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <form
      action={createProduct}
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">Ny produkt</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Skapas i POS-katalogen. För många produkter från WooCommerce, använd{" "}
          <code className="rounded bg-zinc-100 px-1">npm run import:products</code>.
        </p>
      </div>

      <Field label="Butik" name="storeId" type="select" stores={stores} defaultStoreId={defaultStoreId} />
      <Field label="Produktnamn" name="name" required />
      <Field
        label="Kort beskrivning"
        name="shortDescription"
        hint="Visas i upphämtningsmail och katalog."
      />
      <Field label="Pris (kr)" name="price" type="number" min="0" step="0.01" defaultValue="0" />
      <Field label="EAN" name="ean" />
      <Field label="Lagersaldo" name="stockQuantity" type="number" min="0" defaultValue="0" />
      <Field label="Lagerplats" name="stockLocation" />
      <TaxonomyFields />

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={creating}
          className="min-h-12 flex-1 cursor-pointer rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
        >
          {creating ? "Skapar..." : "Skapa produkt"}
        </button>
        <Link
          href="/admin/products"
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 sm:flex-none"
        >
          Avbryt
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  hint,
  min,
  step,
  defaultValue,
  placeholder,
  stores,
  defaultStoreId,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  hint?: string;
  min?: string;
  step?: string;
  defaultValue?: string | number;
  placeholder?: string;
  stores?: StoreOption[];
  defaultStoreId?: string;
}) {
  if (type === "select" && stores) {
    return (
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
        {label}
        <select
          name={name}
          required
          defaultValue={defaultStoreId || stores[0]?.id || ""}
          className="min-h-12 cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 text-base font-normal text-zinc-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
        >
          <option value="">Välj butik</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
        {hint ? <span className="text-xs font-normal text-zinc-500">{hint}</span> : null}
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        min={min}
        step={step}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="min-h-12 cursor-text rounded-lg border border-zinc-200 bg-white px-3 text-base font-normal text-zinc-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
      />
      {hint ? <span className="text-xs font-normal text-zinc-500">{hint}</span> : null}
    </label>
  );
}
