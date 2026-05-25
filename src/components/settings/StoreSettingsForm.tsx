"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Store } from "@/generated/prisma/client";

type StoreOption = Pick<Store, "id" | "name">;

type EditableStore = Pick<
  Store,
  | "id"
  | "name"
  | "slug"
  | "logoUrl"
  | "wooUrl"
  | "address"
  | "receiptFooter"
  | "returnText"
  | "thankYouMessage"
  | "socialLinks"
  | "receiptWidthMm"
>;

type StoreSettingsFormProps = {
  stores: StoreOption[];
  store: EditableStore;
};

export function StoreSettingsForm({ stores, store }: StoreSettingsFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  function selectStore(storeId: string) {
    router.push(`/admin/settings?storeId=${storeId}`);
  }

  async function saveSettings(formData: FormData) {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const body = {
      name: formData.get("name"),
      logoUrl: formData.get("logoUrl"),
      wooUrl: formData.get("wooUrl"),
      address: formData.get("address"),
      receiptFooter: formData.get("receiptFooter"),
      returnText: formData.get("returnText"),
      thankYouMessage: formData.get("thankYouMessage"),
      socialLinks: formData.get("socialLinks"),
      receiptWidthMm: formData.get("receiptWidthMm"),
    };

    try {
      const response = await fetch(`/api/stores/${store.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setError(await getErrorMessage(response, "Kunde inte spara settings"));
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch (error) {
      console.error(error);
      setError("Något gick fel vid anropet. Försök igen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Välj butik
          <select
            value={store.id}
            onChange={(event) => selectStore(event.target.value)}
            className="min-h-12 cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 text-base font-normal text-zinc-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
          >
            {stores.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <form
        action={saveSettings}
        className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4"
      >
        <SettingsSection
          title="Butik"
          description="Grundinformation som visas internt och på kvitto."
        >
          <Field label="Butiksnamn" name="name" defaultValue={store.name} />
          <Field
            label="Logo URL"
            name="logoUrl"
            defaultValue={store.logoUrl ?? ""}
          />
          <Textarea
            label="Adress"
            name="address"
            defaultValue={store.address ?? ""}
          />
        </SettingsSection>

        <SettingsSection
          title="Kvitto"
          description="Texter och format som används när kvittot skrivs ut."
        >
          <Field
            label="Kvittobredd (mm)"
            name="receiptWidthMm"
            type="number"
            min="58"
            max="112"
            defaultValue={store.receiptWidthMm}
          />
          <Textarea
            label="Tackmeddelande"
            name="thankYouMessage"
            defaultValue={store.thankYouMessage ?? ""}
          />
          <Textarea
            label="Footer-text"
            name="receiptFooter"
            defaultValue={store.receiptFooter ?? ""}
          />
          <Textarea
            label="Returtext"
            name="returnText"
            defaultValue={store.returnText ?? ""}
          />
          <Textarea
            label="Sociala medier"
            name="socialLinks"
            defaultValue={store.socialLinks ?? ""}
          />
        </SettingsSection>

        <SettingsSection
          title="WooCommerce"
          description="Fyll i URL nu. API-nycklar och webhooks byggs när riktig åtkomst finns."
        >
          <Field
            label="WooCommerce URL"
            name="wooUrl"
            type="url"
            defaultValue={store.wooUrl ?? ""}
          />
        </SettingsSection>

        {error ? <Alert type="error" message={error} /> : null}
        {success ? (
          <Alert type="success" message="Settings sparades." />
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="min-h-12 cursor-pointer rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
        >
          {saving ? "Sparar..." : "Spara settings"}
        </button>
      </form>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-b border-zinc-100 pb-4 last:border-b-0 last:pb-0">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  min,
  max,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  min?: string;
  max?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
      {label}
      <input
        name={name}
        type={type}
        min={min}
        max={max}
        defaultValue={defaultValue}
        className="min-h-12 cursor-text rounded-lg border border-zinc-200 bg-white px-3 text-base font-normal text-zinc-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
      />
    </label>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={3}
        className="min-h-24 cursor-text resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base font-normal text-zinc-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
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

async function getErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}
