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
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Produktnamn är skrivskyddat
        </p>
        <p className="mt-1 text-base font-semibold text-zinc-900">
          {product.name}
        </p>
        <p className="mt-1 break-words text-xs text-zinc-500">
          Slug: {product.slug}
        </p>
      </section>

      <form
        action={saveProduct}
        className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4"
      >
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            Lager och pris
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            Dessa fält är lokala för POS/lager tills Woo-sync byggs.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Field
            label="Pris (kr)"
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={Number(product.price)}
          />
          <Field label="EAN" name="ean" defaultValue={product.ean ?? ""} />
          <Field
            label="Lagersaldo"
            name="stockQuantity"
            type="number"
            min="0"
            defaultValue={product.stockQuantity}
          />
          <Field
            label="Lagerplats"
            name="stockLocation"
            defaultValue={product.stockLocation ?? ""}
          />
        </div>

        {error ? <Alert type="error" message={error} /> : null}
        {success ? <Alert type="success" message="Produkten sparades." /> : null}

        <button
          type="submit"
          disabled={saving}
          className="min-h-12 cursor-pointer rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Sparar..." : "Spara produkt"}
        </button>
      </form>

      {product.variants.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-zinc-900">Varianter</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Varje variant har eget pris, EAN, lager och lagerplats.
            </p>
          </div>
          {product.variants.map((variant) => (
            <VariantForm
              key={variant.id}
              productId={product.id}
              variant={variant}
            />
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
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function saveVariant(formData: FormData) {
    setSaving(true);
    setError(null);
    setSuccess(false);

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

    setSuccess(true);
    router.refresh();
  }

  return (
    <form
      action={saveVariant}
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-zinc-900">{variant.name}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Woo variant ID: {variant.wooVariantId}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
          Lager {variant.stockQuantity}
        </span>
      </div>

      <Field
        label="Pris (kr)"
        name="price"
        type="number"
        min="0"
        step="0.01"
        defaultValue={Number(variant.price)}
      />
      <Field label="EAN" name="ean" defaultValue={variant.ean ?? ""} />
      <Field
        label="Lager"
        name="stockQuantity"
        type="number"
        min="0"
        defaultValue={variant.stockQuantity}
      />
      <Field
        label="Lagerplats"
        name="stockLocation"
        defaultValue={variant.stockLocation ?? ""}
      />
      {error ? <Alert type="error" message={error} /> : null}
      {success ? <Alert type="success" message="Varianten sparades." /> : null}
      <button
        type="submit"
        disabled={saving}
        className="min-h-11 cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
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
  min,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  step?: string;
  min?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
      {label}
      <input
        name={name}
        type={type}
        step={step}
        min={min}
        defaultValue={defaultValue}
        className="min-h-12 cursor-text rounded-lg border border-zinc-200 bg-white px-3 text-base font-normal text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
      />
    </label>
  );
}

function Alert({
  type,
  message,
}: {
  type: "error" | "success";
  message: string;
}) {
  const styles =
    type === "error"
      ? "bg-red-50 text-red-700"
      : "bg-emerald-50 text-emerald-700";
  return <p className={`rounded-lg px-3 py-2 text-sm ${styles}`}>{message}</p>;
}
