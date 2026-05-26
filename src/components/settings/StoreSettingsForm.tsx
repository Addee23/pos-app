"use client";

import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useMemo, useRef, useState } from "react";
import type { Store } from "@/generated/prisma/client";
import type { WooWebhookMode } from "@/lib/woo-webhook-config";

type StoreOption = Pick<Store, "id" | "name">;

type EditableStore = Pick<
  Store,
  | "id"
  | "name"
  | "slug"
  | "logoUrl"
  | "wooUrl"
  | "wooConsumerKey"
  | "wooConsumerSecret"
  | "wooWebhookSecret"
  | "smtpHost"
  | "smtpPort"
  | "smtpSecure"
  | "smtpUser"
  | "smtpPass"
  | "smtpFrom"
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
  baseUrl: string;
  webhookMode: WooWebhookMode;
};

export function StoreSettingsForm({
  stores,
  store,
  baseUrl,
  webhookMode,
}: StoreSettingsFormProps) {
  const router = useRouter();
  const createStoreInFlight = useRef(false);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [testEmail, setTestEmail] = useState("adiiinaaaa86@gmail.com");
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<string | null>(null);
  const [createStoreOpen, setCreateStoreOpen] = useState(false);
  const [creatingStore, setCreatingStore] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const webhookUrls = useMemo(
    () => [
      {
        id: "order-created",
        label: "Order created",
        url: `${baseUrl}/api/webhooks/woocommerce/${store.id}/order-created`,
      },
      {
        id: "order-updated",
        label: "Order updated",
        url: `${baseUrl}/api/webhooks/woocommerce/${store.id}/order-updated`,
      },
    ],
    [baseUrl, store.id],
  );

  function selectStore(storeId: string) {
    router.push(`/admin/settings?storeId=${storeId}`);
  }

  async function createStore(formData: FormData) {
    if (createStoreInFlight.current) {
      return;
    }

    createStoreInFlight.current = true;
    setCreatingStore(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.get("storeName") }),
      });

      if (!response.ok) {
        setError(await getErrorMessage(response, "Kunde inte skapa butik"));
        return;
      }

      const createdStore = (await response.json()) as { id: string };
      setCreateStoreOpen(false);
      router.push(`/admin/settings?storeId=${createdStore.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      setError("Något gick fel vid anropet. Försök igen.");
    } finally {
      createStoreInFlight.current = false;
      setCreatingStore(false);
    }
  }

  async function saveSettings(formData: FormData) {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const body = {
      name: formData.get("name"),
      logoUrl: formData.get("logoUrl"),
      wooUrl: formData.get("wooUrl"),
      wooConsumerKey: formData.get("wooConsumerKey"),
      wooConsumerSecret: formData.get("wooConsumerSecret"),
      wooWebhookSecret: formData.get("wooWebhookSecret"),
      smtpHost: formData.get("smtpHost"),
      smtpPort: formData.get("smtpPort"),
      smtpSecure: formData.get("smtpSecure") === "on",
      smtpUser: formData.get("smtpUser"),
      smtpPass: formData.get("smtpPass"),
      smtpFrom: formData.get("smtpFrom"),
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
      setWebhookSecret("");
      router.refresh();
    } catch (error) {
      console.error(error);
      setError("Något gick fel vid anropet. Försök igen.");
    } finally {
      setSaving(false);
    }
  }

  async function sendTestEmail() {
    setTestingEmail(true);
    setError(null);
    setSuccess(false);
    setTestEmailResult(null);

    try {
      const response = await fetch(`/api/stores/${store.id}/settings/test-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: testEmail }),
      });

      if (!response.ok) {
        setError(await getErrorMessage(response, "Kunde inte skicka testmail"));
        return;
      }

      setTestEmailResult(`Testmail skickades till ${testEmail}.`);
    } catch (error) {
      console.error(error);
      setError("Något gick fel när testmailet skulle skickas.");
    } finally {
      setTestingEmail(false);
    }
  }

  async function copyToClipboard(id: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1600);
  }

  function generateWebhookSecret() {
    setWebhookSecret(randomSecret());
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm font-semibold text-zinc-700">
            Välj butik
            <select
              value={store.id}
              onChange={(event) => selectStore(event.target.value)}
              className="min-h-12 cursor-pointer rounded-2xl border border-zinc-200 bg-white px-3 text-base font-normal text-zinc-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
            >
              {stores.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setCreateStoreOpen((open) => !open)}
            className="min-h-12 shrink-0 cursor-pointer rounded-2xl border border-blue-100 bg-blue-50 px-4 text-sm font-bold text-blue-700 transition hover:border-blue-200 hover:bg-blue-100"
          >
            Lägg till
          </button>
        </div>

        {createStoreOpen ? (
          <form action={createStore} className="mt-3 flex flex-col gap-2">
            <Field
              label="Ny butik"
              name="storeName"
              placeholder="Butiksnamn"
            />
            <button
              type="submit"
              disabled={creatingStore}
              className="min-h-12 cursor-pointer rounded-2xl bg-accent px-4 text-sm font-bold text-accent-foreground shadow-sm shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            >
              {creatingStore ? "Skapar..." : "Skapa butik"}
            </button>
          </form>
        ) : null}
      </section>

      <form action={saveSettings} className="flex flex-col gap-4">
        <IntegrationCard
          store={store}
          webhookMode={webhookMode}
          webhookSecret={webhookSecret}
          webhookUrls={webhookUrls}
          copied={copied}
          onGenerateSecret={generateWebhookSecret}
          onWebhookSecretChange={setWebhookSecret}
          onCopy={copyToClipboard}
        />

        <SmtpSettingsCard
          store={store}
          testEmail={testEmail}
          testingEmail={testingEmail}
          testEmailResult={testEmailResult}
          onTestEmailChange={setTestEmail}
          onSendTestEmail={sendTestEmail}
        />

        <SettingsCard
          title="Butik & upphämtningsmail"
          description="Logo och adress visas i mailet när ordern är redo. Adressen används för Google Maps-kartan."
        >
          <Field label="Butiksnamn" name="name" defaultValue={store.name} />
          <Field
            label="Logo URL (direkt länk till bild)"
            name="logoUrl"
            defaultValue={store.logoUrl ?? ""}
            placeholder="https://din-butik.se/logo.png"
          />
          <p className="text-xs leading-5 text-zinc-500">
            Tips: Använd en publik bild-URL (PNG/JPG). Loggan visas högst upp i mailet.
          </p>
          <Textarea
            label="Butiksadress (för karta i mail)"
            name="address"
            defaultValue={store.address ?? ""}
            placeholder="Storgatan 1, 123 45 Stockholm"
          />
          <p className="text-xs leading-5 text-zinc-500">
            Adressen skapar en klickbar Google Maps-karta i bekräftelsemailet till kunden.
            Produktbild och produktinfo i upphämtningsmail hämtas från
            produktkatalogen (Admin → Produkter).
          </p>
        </SettingsCard>

        <SettingsCard
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
        </SettingsCard>

        {error ? <Alert type="error" message={error} /> : null}
        {success ? <Alert type="success" message="Settings sparades." /> : null}

        <button
          type="submit"
          disabled={saving}
          className="min-h-12 cursor-pointer rounded-2xl bg-accent px-4 text-sm font-bold text-accent-foreground shadow-sm shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
        >
          {saving ? "Sparar..." : "Spara inställningar"}
        </button>
      </form>
    </div>
  );
}

function IntegrationCard({
  store,
  webhookMode,
  webhookSecret,
  webhookUrls,
  copied,
  onGenerateSecret,
  onWebhookSecretChange,
  onCopy,
}: {
  store: EditableStore;
  webhookMode: WooWebhookMode;
  webhookSecret: string;
  webhookUrls: { id: string; label: string; url: string }[];
  copied: string | null;
  onGenerateSecret: () => void;
  onWebhookSecretChange: (value: string) => void;
  onCopy: (id: string, value: string) => void;
}) {
  const isTestMode = webhookMode === "test";

  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-950">Integrationer</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Order-webhook skapar upphämtningar automatiskt. Produkter importeras
            via Admin → Produkter eller JSON-fil.
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-bold ${
            isTestMode
              ? "bg-amber-100 text-amber-900"
              : "bg-emerald-100 text-emerald-900"
          }`}
        >
          {isTestMode ? "Testläge" : "Produktion"}
        </span>
      </div>

      <div className="p-4">
        {isTestMode ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
            <p className="font-bold">Testläge (WOOCOMMERCE_WEBHOOK_MODE=test)</p>
            <p className="mt-1">
              Simulera ordrar med{" "}
              <code className="rounded bg-white px-1">npm run simulate:woo-order</code>.
              Byt till{" "}
              <code className="rounded bg-white px-1">production</code> i .env när
              riktig Woo-butik kopplas — samma webhook-URL, då krävs signatur och
              fraktmetod &quot;hämta i butik&quot;.
            </p>
          </div>
        ) : (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-950">
            <p className="font-bold">Produktion</p>
            <p className="mt-1">
              Endast ordrar med upphämtningsfrakt (t.ex. local_pickup) skapar
              upphämtning. Konfigurera webhook i Woo med URL och secret nedan.
            </p>
          </div>
        )}
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-lg bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">
            WOO
          </span>
          <div>
            <p className="text-sm font-bold text-zinc-900">WooCommerce</p>
            <p className="text-xs text-zinc-500">
              API-uppgifter lämnas tomma för att behålla sparade värden.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
          <Field
            label={`WooCommerce URL${store.wooUrl ? " · installerad" : ""}`}
            name="wooUrl"
            type="url"
            defaultValue={store.wooUrl ?? ""}
            placeholder="https://dinbutik.se"
          />
          <Field
            label={`Consumer Key${store.wooConsumerKey ? " · installerad" : " · inte installerad"}`}
            name="wooConsumerKey"
            placeholder="Lämna tomt för att behålla"
          />
          <Field
            label={`Consumer Secret${store.wooConsumerSecret ? " · installerad" : " · inte installerad"}`}
            name="wooConsumerSecret"
            placeholder="Lämna tomt för att behålla"
          />
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <Field
              label={`Webhook Secret${store.wooWebhookSecret ? " · installerad" : " · inte installerad"}`}
              name="wooWebhookSecret"
              value={webhookSecret}
              onChangeValue={onWebhookSecretChange}
              placeholder="Lämna tomt för att behålla"
            />
            <button
              type="button"
              onClick={onGenerateSecret}
              className="mb-0 min-h-12 cursor-pointer rounded-2xl border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
            >
              Generera
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="mt-3 min-h-10 cursor-pointer rounded-2xl bg-zinc-950 px-4 text-xs font-bold text-white transition hover:bg-zinc-800"
        >
          Spara WooCommerce-uppgifter
        </button>

        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs font-bold text-zinc-700">
            Webhook-URL:er för denna butik
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {webhookUrls.map((webhook) => (
              <div key={webhook.id}>
                <p className="text-xs font-semibold text-zinc-500">
                  {webhook.label}
                </p>
                <div className="mt-1 grid grid-cols-[1fr_auto] gap-2">
                  <input
                    readOnly
                    value={webhook.url}
                    className="min-h-10 min-w-0 rounded-2xl border border-zinc-200 bg-white px-3 text-xs text-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => onCopy(webhook.id, webhook.url)}
                    className="min-h-10 cursor-pointer rounded-2xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {copied === webhook.id ? "Kopierad" : "Kopiera"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            Använd samma webhook secret på båda webhooks i WooCommerce.
          </p>
        </div>
      </div>
    </section>
  );
}

function SmtpSettingsCard({
  store,
  testEmail,
  testingEmail,
  testEmailResult,
  onTestEmailChange,
  onSendTestEmail,
}: {
  store: EditableStore;
  testEmail: string;
  testingEmail: boolean;
  testEmailResult: string | null;
  onTestEmailChange: (value: string) => void;
  onSendTestEmail: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-950">Mail / SMTP</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Använd en testmail nu och byt till butikens riktiga mail senare.
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
          SMTP
        </span>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
          <Field
            label={`SMTP host${store.smtpHost ? " · installerad" : ""}`}
            name="smtpHost"
            defaultValue={store.smtpHost ?? ""}
            placeholder="smtp.gmail.com"
          />
          <Field
            label="SMTP port"
            name="smtpPort"
            type="number"
            defaultValue={store.smtpPort ?? 587}
            placeholder="587"
          />
          <label className="mt-2 flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700">
            <input
              name="smtpSecure"
              type="checkbox"
              defaultChecked={store.smtpSecure}
              className="size-4 accent-blue-600"
            />
            Använd säker TLS direkt
          </label>
          <Field
            label={`SMTP användare${store.smtpUser ? " · installerad" : ""}`}
            name="smtpUser"
            placeholder="Lämna tomt för att behålla sparad användare"
          />
          <Field
            label={`SMTP lösenord${store.smtpPass ? " · installerad" : ""}`}
            name="smtpPass"
            type="password"
            placeholder="Lämna tomt för att behålla sparat lösenord"
          />
          <Field
            label="Avsändare"
            name="smtpFrom"
            defaultValue={store.smtpFrom ?? ""}
            placeholder="POS Demo <din-mail@example.com>"
          />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
          <Field
            label="Skicka testmail till"
            name="smtpTestEmail"
            type="email"
            value={testEmail}
            onChangeValue={onTestEmailChange}
            placeholder="din-mail@example.com"
          />
          {testEmailResult ? (
            <p className="mt-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              {testEmailResult}
            </p>
          ) : null}
          <button
            type="button"
            disabled={testingEmail || testEmail.trim().length === 0}
            onClick={onSendTestEmail}
            className="mt-3 min-h-12 w-full cursor-pointer rounded-2xl border border-blue-100 bg-blue-50 px-4 text-sm font-bold text-blue-700 transition hover:border-blue-200 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {testingEmail ? "Skickar..." : "Skicka testmail"}
          </button>
        </div>
      </div>
    </section>
  );
}

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
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
  value,
  onChangeValue,
  type = "text",
  min,
  max,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  value?: string;
  onChangeValue?: (value: string) => void;
  type?: string;
  min?: string;
  max?: string;
  placeholder?: string;
}) {
  const controlledProps =
    value !== undefined
      ? {
          value,
          onChange: (event: ChangeEvent<HTMLInputElement>) =>
            onChangeValue?.(event.target.value),
        }
      : { defaultValue };

  return (
    <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-700">
      {label}
      <input
        name={name}
        type={type}
        min={min}
        max={max}
        placeholder={placeholder}
        {...controlledProps}
        className="min-h-12 cursor-text rounded-2xl border border-zinc-200 bg-white px-3 text-base font-normal text-zinc-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
      />
    </label>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-700">
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={3}
        className="min-h-24 cursor-text resize-y rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-base font-normal text-zinc-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
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
  return <p className={`rounded-2xl px-3 py-2 text-sm ${styles}`}>{message}</p>;
}

function randomSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
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
