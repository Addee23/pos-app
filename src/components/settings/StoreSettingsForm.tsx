"use client";

import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useMemo, useId, useRef, useState } from "react";
import type { Store } from "@/generated/prisma/client";
import type { WooWebhookMode } from "@/lib/woo-webhook-config";
import { formatWooJsonForEditor } from "@/lib/product-woo-json";
import { WooMetaBatchPanel } from "@/components/products/WooMetaBatchPanel";
import { useToast } from "@/components/ui/ToastProvider";

type SettingsSectionId = "butik" | "woocommerce" | "epost" | "kvitto";

type SettingsSection = {
  id: SettingsSectionId;
  label: string;
  description: string;
  shortHint: string;
};

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "butik",
    label: "Butik",
    description: "Namn, logo och adress för upphämtningsmail.",
    shortHint: "Logo & adress",
  },
  {
    id: "woocommerce",
    label: "WooCommerce",
    description: "API, webhooks, produktmeta och JSON.",
    shortHint: "Integration",
  },
  {
    id: "epost",
    label: "E-post",
    description: "SMTP och testmail till kunder.",
    shortHint: "SMTP & test",
  },
  {
    id: "kvitto",
    label: "Kvitto",
    description: "Texter och utskriftsformat i kassan.",
    shortHint: "Utskrift",
  },
];

const SECTION_STYLES: Record<
  SettingsSectionId,
  {
    activeSurface: string;
    activeBorder: string;
    icon: string;
    iconActive: string;
    title: string;
    bar: string;
    mobileHeader: string;
  }
> = {
  butik: {
    activeSurface: "bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/40",
    activeBorder: "border-violet-200/90 shadow-md shadow-violet-100/80",
    icon: "bg-violet-100 text-violet-700",
    iconActive: "bg-violet-600 text-white shadow-md shadow-violet-200",
    title: "text-violet-950",
    bar: "bg-violet-500",
    mobileHeader:
      "border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-white",
  },
  woocommerce: {
    activeSurface: "bg-gradient-to-br from-orange-50 via-white to-amber-50/50",
    activeBorder: "border-orange-200/90 shadow-md shadow-orange-100/80",
    icon: "bg-orange-100 text-orange-700",
    iconActive: "bg-orange-500 text-white shadow-md shadow-orange-200",
    title: "text-orange-950",
    bar: "bg-orange-500",
    mobileHeader:
      "border-orange-200/80 bg-gradient-to-br from-orange-50 via-white to-white",
  },
  epost: {
    activeSurface: "bg-gradient-to-br from-sky-50 via-white to-blue-50/40",
    activeBorder: "border-sky-200/90 shadow-md shadow-sky-100/80",
    icon: "bg-sky-100 text-sky-700",
    iconActive: "bg-sky-600 text-white shadow-md shadow-sky-200",
    title: "text-sky-950",
    bar: "bg-sky-500",
    mobileHeader:
      "border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-white",
  },
  kvitto: {
    activeSurface: "bg-gradient-to-br from-emerald-50 via-white to-teal-50/40",
    activeBorder: "border-emerald-200/90 shadow-md shadow-emerald-100/80",
    icon: "bg-emerald-100 text-emerald-700",
    iconActive: "bg-emerald-600 text-white shadow-md shadow-emerald-200",
    title: "text-emerald-950",
    bar: "bg-emerald-500",
    mobileHeader:
      "border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-white",
  },
};

function parseSettingsSection(value: string | undefined): SettingsSectionId {
  if (
    value === "butik" ||
    value === "woocommerce" ||
    value === "epost" ||
    value === "kvitto"
  ) {
    return value;
  }

  return "butik";
}

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
  initialSection?: string;
};

export function StoreSettingsForm({
  stores,
  store,
  baseUrl,
  webhookMode,
  initialSection,
}: StoreSettingsFormProps) {
  const router = useRouter();
  const toast = useToast();
  const createStoreInFlight = useRef(false);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(
    () => parseSettingsSection(initialSection),
  );
  const [webhookSecret, setWebhookSecret] = useState("");
  const [testEmail, setTestEmail] = useState("adiiinaaaa86@gmail.com");
  const [testingEmail, setTestingEmail] = useState(false);
  const [createStoreOpen, setCreateStoreOpen] = useState(false);
  const [creatingStore, setCreatingStore] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const webhookUrls = useMemo(
    () => [
      {
        id: "order-created",
        label: "Order skapad",
        url: `${baseUrl}/api/webhooks/woocommerce/${store.id}/order-created`,
      },
      {
        id: "order-updated",
        label: "Order uppdaterad",
        url: `${baseUrl}/api/webhooks/woocommerce/${store.id}/order-updated`,
      },
    ],
    [baseUrl, store.id],
  );

  function selectStore(storeId: string) {
    const params = new URLSearchParams();
    params.set("storeId", storeId);
    params.set("section", activeSection);
    router.push(`/admin/settings?${params.toString()}`);
  }

  function selectSection(sectionId: SettingsSectionId) {
    setActiveSection(sectionId);
    const params = new URLSearchParams(window.location.search);
    params.set("section", sectionId);
    router.replace(`/admin/settings?${params.toString()}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const activeSectionMeta =
    SETTINGS_SECTIONS.find((section) => section.id === activeSection) ??
    SETTINGS_SECTIONS[0];
  const activeSectionStyle = SECTION_STYLES[activeSection];

  async function createStore(formData: FormData) {
    if (createStoreInFlight.current) {
      return;
    }

    createStoreInFlight.current = true;
    setCreatingStore(true);

    try {
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.get("storeName") }),
      });

      if (!response.ok) {
        toast.error(await getErrorMessage(response, "Kunde inte skapa butik"));
        return;
      }

      const createdStore = (await response.json()) as { id: string };
      setCreateStoreOpen(false);
      router.push(
        `/admin/settings?storeId=${createdStore.id}&section=${activeSection}`,
      );
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Något gick fel vid anropet. Försök igen.");
    } finally {
      createStoreInFlight.current = false;
      setCreatingStore(false);
    }
  }

  async function saveSettings(formData: FormData) {
    setSaving(true);

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
        toast.error(await getErrorMessage(response, "Kunde inte spara inställningar"));
        return;
      }

      toast.success("Inställningarna sparades.");
      setWebhookSecret("");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Något gick fel vid anropet. Försök igen.");
    } finally {
      setSaving(false);
    }
  }

  async function sendTestEmail() {
    setTestingEmail(true);

    try {
      const response = await fetch(`/api/stores/${store.id}/settings/test-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: testEmail }),
      });

      if (!response.ok) {
        toast.error(await getErrorMessage(response, "Kunde inte skicka testmail"));
        return;
      }

      toast.success(`Testmail skickades till ${testEmail}.`);
    } catch (error) {
      console.error(error);
      toast.error("Något gick fel när testmailet skulle skickas.");
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
              placeholder="t.ex. Demo Butik"
              hint="Namnet visas i appen och på kvitton."
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

      <div className="flex flex-col gap-4">
        <SettingsSectionNav
          activeSection={activeSection}
          activeDescription={activeSectionMeta.description}
          onSelect={selectSection}
        />

        <form action={saveSettings} className="flex min-w-0 flex-col gap-4">
          <section
            className={`rounded-3xl border p-4 shadow-sm lg:hidden ${activeSectionStyle.mobileHeader}`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${activeSectionStyle.iconActive}`}
              >
                <SettingsSectionIcon section={activeSection} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">
                  {activeSectionMeta.shortHint}
                </p>
                <h3
                  className={`mt-0.5 text-base font-bold ${activeSectionStyle.title}`}
                >
                  {activeSectionMeta.label}
                </h3>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  {activeSectionMeta.description}
                </p>
              </div>
            </div>
          </section>

          <div className={activeSection === "butik" ? "flex flex-col gap-4" : "hidden"}>
            <SettingsCard
              title="Butik & upphämtningsmail"
              description="Logo och adress visas i mailet när ordern är redo. Adressen används för Google Maps-kartan."
            >
              <Field
                label="Butiksnamn"
                name="name"
                defaultValue={store.name}
                placeholder="t.ex. Demo Butik"
                hint="Visas i appen, på kvitton och i upphämtningsmail."
              />
              <Field
                label="Logo URL (direkt länk till bild)"
                name="logoUrl"
                defaultValue={store.logoUrl ?? ""}
                placeholder="https://din-butik.se/logo.png"
                hint="Publik bild-URL (PNG/JPG). Loggan visas högst upp i upphämtningsmailet."
              />
              <Textarea
                label="Butiksadress (för karta i mail)"
                name="address"
                defaultValue={store.address ?? ""}
                placeholder="Storgatan 1, 123 45 Stockholm"
                hint="Skapar en klickbar Google Maps-karta i bekräftelsemailet till kunden."
              />
            </SettingsCard>
          </div>

          <div
            className={activeSection === "woocommerce" ? "flex flex-col gap-4" : "hidden"}
          >
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
          </div>

          <div className={activeSection === "epost" ? "flex flex-col gap-4" : "hidden"}>
            <SmtpSettingsCard
              store={store}
              testEmail={testEmail}
              testingEmail={testingEmail}
              onTestEmailChange={setTestEmail}
              onSendTestEmail={sendTestEmail}
            />
          </div>

          <div className={activeSection === "kvitto" ? "flex flex-col gap-4" : "hidden"}>
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
                placeholder="80"
                hint="Vanligt 58 eller 80 mm för termoskrivare."
              />
              <Textarea
                label="Tackmeddelande"
                name="thankYouMessage"
                defaultValue={store.thankYouMessage ?? ""}
                placeholder="Tack för ditt köp!"
                hint="Visas högst upp på kvittot efter köpet."
              />
              <Textarea
                label="Footer-text"
                name="receiptFooter"
                defaultValue={store.receiptFooter ?? ""}
                placeholder="Öppet mån–fre 10–18"
                hint="Extra information längst ner på kvittot."
              />
              <Textarea
                label="Returtext"
                name="returnText"
                defaultValue={store.returnText ?? ""}
                placeholder="14 dagars öppet köp med kvitto"
                hint="Retur- och bytespolicy som skrivs ut på kvittot."
              />
              <Textarea
                label="Sociala medier"
                name="socialLinks"
                defaultValue={store.socialLinks ?? ""}
                placeholder="Instagram: @butik · Facebook: /butik"
                hint="Valfria länkar eller handtag som visas på kvittot."
              />
            </SettingsCard>
          </div>

          <div className="sticky bottom-20 z-20 rounded-2xl border border-zinc-200/80 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
            <p className="mb-2 text-center text-[11px] font-semibold text-zinc-500 lg:text-left">
              Sparar alla fält oavsett vilken flik du står på.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="min-h-12 w-full cursor-pointer rounded-2xl bg-accent px-4 text-sm font-bold text-accent-foreground shadow-sm shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            >
              {saving ? "Sparar..." : "Spara inställningar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SettingsSectionNav({
  activeSection,
  activeDescription,
  onSelect,
}: {
  activeSection: SettingsSectionId;
  activeDescription: string;
  onSelect: (sectionId: SettingsSectionId) => void;
}) {
  const activeStyle = SECTION_STYLES[activeSection];

  return (
    <nav aria-label="Inställningssektioner">
      <div className="overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white shadow-sm">
        <div className="hidden border-b border-zinc-100 px-5 py-3 lg:block">
          <p className="text-sm font-bold text-zinc-950">Vad vill du göra?</p>
          <p className="mt-0.5 text-xs leading-5 text-zinc-500">
            Välj ett område att konfigurera.
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-2 p-2 lg:flex lg:gap-1.5 lg:p-2">
          {SETTINGS_SECTIONS.map((section) => {
            const active = section.id === activeSection;
            const style = SECTION_STYLES[section.id];

            return (
              <li key={section.id} className="min-w-0 lg:flex-1">
                <button
                  type="button"
                  onClick={() => onSelect(section.id)}
                  aria-current={active ? "page" : undefined}
                  className={`group flex w-full cursor-pointer rounded-2xl border text-left transition duration-200 ${
                    active
                      ? `${style.activeSurface} ${style.activeBorder}`
                      : "border-transparent bg-zinc-50/80 hover:border-zinc-200 hover:bg-white lg:bg-transparent"
                  }`}
                >
                  <span className="flex min-h-[5.5rem] w-full flex-col items-center gap-2 p-3 text-center lg:min-h-0 lg:flex-row lg:justify-center lg:gap-2.5 lg:px-3 lg:py-3">
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-2xl transition lg:size-9 ${
                        active ? style.iconActive : style.icon
                      }`}
                    >
                      <SettingsSectionIcon section={section.id} />
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-sm font-bold leading-tight ${
                          active ? style.title : "text-zinc-900"
                        }`}
                      >
                        {section.label}
                      </span>
                      <span className="mt-1 block text-[11px] font-medium leading-4 text-zinc-500 lg:hidden">
                        {section.shortHint}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p
          className={`hidden border-t px-5 py-3 text-sm leading-6 lg:block ${activeStyle.mobileHeader} border-zinc-100/80 text-zinc-600`}
        >
          {activeDescription}
        </p>
      </div>
    </nav>
  );
}

function SettingsSectionIcon({ section }: { section: SettingsSectionId }) {
  const className = "size-5";

  switch (section) {
    case "butik":
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
          <path
            d="M3.5 8.5 10 3.5l6.5 5v7.5a1 1 0 0 1-1 1h-4v-5H8.5v5h-4a1 1 0 0 1-1-1V8.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "woocommerce":
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
          <path
            d="M4 5.5h12M4 10h12M4 14.5h7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="14.5" cy="14.5" r="2" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "epost":
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
          <rect
            x="2.5"
            y="4.5"
            width="15"
            height="11"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="m3.5 6.5 6.5 4.5 6.5-4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "kvitto":
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
          <path
            d="M5.5 3.5h9a1 1 0 0 1 1 1v11.5l-2.25-1.25L10.5 16l-2.75-1.25L5.5 16V4.5a1 1 0 0 1 1-1Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M8 8h4M8 11h4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
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
  const toast = useToast();
  const isTestMode = webhookMode === "test";
  const [fetchedJson, setFetchedJson] = useState("");
  const [fetchingJson, setFetchingJson] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);

  async function handleFetchLatestJson() {
    setFetchingJson(true);
    setJsonCopied(false);

    try {
      const response = await fetch(
        `/api/stores/${store.id}/products/woo-latest?limit=10`,
      );
      const data = (await response.json()) as {
        error?: string;
        jsonText?: string;
      };

      if (!response.ok) {
        toast.error(data.error ?? "Kunde inte hämta JSON");
        return;
      }

      setFetchedJson(data.jsonText ?? formatWooJsonForEditor([]));
    } catch {
      toast.error("Något gick fel. Försök igen.");
    } finally {
      setFetchingJson(false);
    }
  }

  async function handleCopyJson() {
    if (!fetchedJson) {
      return;
    }

    try {
      await navigator.clipboard.writeText(fetchedJson);
      setJsonCopied(true);
      window.setTimeout(() => setJsonCopied(false), 2000);
    } catch {
      toast.error("Kunde inte kopiera");
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-950">WooCommerce</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            API, webhooks, produktmeta och JSON från butiken.
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
        <p className="mb-3 text-xs text-zinc-500">
          API-uppgifter: lämna tomt för att behålla sparade värden.
        </p>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
          <Field
            label={`WooCommerce URL${store.wooUrl ? " · installerad" : ""}`}
            name="wooUrl"
            type="url"
            defaultValue={store.wooUrl ?? ""}
            placeholder="https://dinbutik.se"
            hint="Butikens WooCommerce-adress utan /wp-admin."
          />
          <Field
            label={`Consumer Key${store.wooConsumerKey ? " · installerad" : " · inte installerad"}`}
            name="wooConsumerKey"
            placeholder="ck_xxxxxxxxxxxxxxxx"
            hint="Lämna tomt för att behålla sparad nyckel."
          />
          <Field
            label={`Consumer Secret${store.wooConsumerSecret ? " · installerad" : " · inte installerad"}`}
            name="wooConsumerSecret"
            placeholder="cs_xxxxxxxxxxxxxxxx"
            hint="Lämna tomt för att behålla sparad hemlighet."
          />
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <Field
              label={`Webhook Secret${store.wooWebhookSecret ? " · installerad" : " · inte installerad"}`}
              name="wooWebhookSecret"
              value={webhookSecret}
              onChangeValue={onWebhookSecretChange}
              placeholder="Generera eller klistra in"
              hint="Samma secret används på båda webhooks i WooCommerce."
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

        <div className="mt-5 border-t border-zinc-100 pt-4">
          <WooMetaBatchPanel lockStoreId={store.id} embedded />
        </div>

        <div className="mt-4 border-t border-zinc-100 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-zinc-600">
              JSON · 10 senaste från Woo
            </p>
            <button
              type="button"
              onClick={() => void handleFetchLatestJson()}
              disabled={fetchingJson}
              className="h-9 cursor-pointer rounded-lg bg-zinc-900 px-3 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:bg-zinc-300"
            >
              {fetchingJson ? "Hämtar…" : "Hämta JSON"}
            </button>
          </div>

          {fetchedJson ? (
            <>
              <textarea
                readOnly
                value={fetchedJson}
                rows={6}
                className="mt-2 w-full resize-y rounded-xl bg-zinc-100/60 px-3 py-2 font-mono text-xs leading-5 text-zinc-700 outline-none"
              />
              <button
                type="button"
                onClick={() => void handleCopyJson()}
                className="mt-2 h-8 cursor-pointer rounded-lg px-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
              >
                {jsonCopied ? "Kopierad" : "Kopiera"}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SmtpSettingsCard({
  store,
  testEmail,
  testingEmail,
  onTestEmailChange,
  onSendTestEmail,
}: {
  store: EditableStore;
  testEmail: string;
  testingEmail: boolean;
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
            hint="Servern som skickar e-post, t.ex. smtp.gmail.com."
          />
          <Field
            label="SMTP port"
            name="smtpPort"
            type="number"
            defaultValue={store.smtpPort ?? 587}
            placeholder="587"
            hint="Vanligt 587 (TLS) eller 465 (SSL)."
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
            placeholder="din-mail@example.com"
            hint="Lämna tomt för att behålla sparad användare."
          />
          <Field
            label={`SMTP lösenord${store.smtpPass ? " · installerad" : ""}`}
            name="smtpPass"
            type="password"
            placeholder="••••••••"
            hint="Lämna tomt för att behålla sparat lösenord."
          />
          <Field
            label="Avsändare"
            name="smtpFrom"
            defaultValue={store.smtpFrom ?? ""}
            placeholder="POS Demo <din-mail@example.com>"
            hint="Namn och e-post som mottagaren ser som avsändare."
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
            hint="Kontrollera att SMTP-inställningarna fungerar innan du går live."
          />
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
  hint,
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
  hint?: string;
}) {
  const generatedId = useId();
  const inputId = `${name}-${generatedId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const controlledProps =
    value !== undefined
      ? {
          value,
          onChange: (event: ChangeEvent<HTMLInputElement>) =>
            onChangeValue?.(event.target.value),
        }
      : { defaultValue };

  return (
    <label htmlFor={inputId} className="flex flex-col gap-1 text-sm font-semibold text-zinc-700">
      {label}
      <input
        id={inputId}
        name={name}
        type={type}
        min={min}
        max={max}
        placeholder={placeholder}
        aria-describedby={hintId}
        {...controlledProps}
        className="min-h-12 cursor-text rounded-2xl border border-zinc-200 bg-white px-3 text-base font-normal text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
      />
      {hint ? (
        <span id={hintId} className="text-xs font-normal leading-5 text-zinc-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
}) {
  const generatedId = useId();
  const inputId = `${name}-${generatedId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <label htmlFor={inputId} className="flex flex-col gap-1 text-sm font-semibold text-zinc-700">
      {label}
      <textarea
        id={inputId}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-describedby={hintId}
        rows={3}
        className="min-h-24 cursor-text resize-y rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-base font-normal text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
      />
      {hint ? (
        <span id={hintId} className="text-xs font-normal leading-5 text-zinc-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
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
