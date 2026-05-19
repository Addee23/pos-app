"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product, ProductVariant } from "@/generated/prisma/client";

type ProductEditFormProps = {
  product: Product & { variants: ProductVariant[] };
};

export function ProductEditForm({ product }: ProductEditFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  async function saveProduct(formData: FormData) {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const body = {
      price: formData.get("price"),
      ean: formData.get("ean"),
      stockQuantity: formData.get("stockQuantity"),
      stockLocation: formData.get("stockLocation"),
    };

    const response = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Kunde inte spara produkten");
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
          Produktnamn (skrivskyddat)
        </p>
        <p className="text-base font-semibold text-zinc-900">{product.name}</p>
        <p className="mt-1 text-xs text-zinc-500">Slug: {product.slug}</p>
      </section>

      <form action={saveProduct} className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Enkel produkt</h2>
        <Field label="Pris (kr)" name="price" type="number" step="0.01" defaultValue={Number(product.price)} />
        <Field label="EAN" name="ean" defaultValue={product.ean ?? ""} />
        <Field label="Lagersaldo" name="stockQuantity" type="number" defaultValue={product.stockQuantity} />
        <Field label="Lagerplats" name="stockLocation" defaultValue={product.stockLocation ?? ""} />

        {error ? <Alert type="error" message={error} /> : null}
        {success ? <Alert type="success" message="Produkten sparades!" /> : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Sparar..." : "Spara produkt"}
        </button>
      </form>

      {product.variants.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-900">Varianter</h2>
          {product.variants.map((variant) => (
            <VariantForm key={variant.id} productId={product.id} variant={variant} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function VariantForm({
  productId,
  variant,
}: {
  productId: string;
  variant: ProductVariant;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveVariant(formData: FormData) {
    setSaving(true);
    setError(null);

    const body = {
      price: formData.get("price"),
      ean: formData.get("ean"),
      stockQuantity: formData.get("stockQuantity"),
      stockLocation: formData.get("stockLocation"),
    };

    const response = await fetch(
      `/api/products/${productId}/variants/${variant.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    setSaving(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Kunde inte spara varianten");
      return;
    }

    router.refresh();
  }

  return (
    <form action={saveVariant} className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="font-medium text-zinc-900">{variant.name}</p>
      <Field label="Pris (kr)" name="price" type="number" step="0.01" defaultValue={Number(variant.price)} />
      <Field label="EAN" name="ean" defaultValue={variant.ean ?? ""} />
      <Field label="Lager" name="stockQuantity" type="number" defaultValue={variant.stockQuantity} />
      <Field label="Lagerplats" name="stockLocation" defaultValue={variant.stockLocation ?? ""} />
      {error ? <Alert type="error" message={error} /> : null}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium disabled:opacity-60"
      >
        {saving ? "Sparar..." : "Spara variant"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  step,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
      {label}
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base font-normal text-zinc-900"
      />
    </label>
  );
}

function Alert({ type, message }: { type: "error" | "success"; message: string }) {
  const styles =
    type === "error"
      ? "bg-red-50 text-red-700"
      : "bg-emerald-50 text-emerald-700";
  return <p className={`rounded-lg px-3 py-2 text-sm ${styles}`}>{message}</p>;
}
