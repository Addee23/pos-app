"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  PICKUP_DASHBOARD_LIMIT,
  PICKUP_DASHBOARD_REFRESH_MS,
  PICKUP_TAB_LABELS,
  type PickupDashboardTab,
} from "@/lib/pickup-dashboard";
import type { PickupDashboardPayload } from "@/lib/pickup-dashboard-data";
import type { SerializedPickup } from "@/lib/pickup-serialize";

type UserRole = "ADMIN" | "PERSONAL";

type PickupStatus = "READY" | "PICKED_UP" | "CANCELLED";

type PickupItem = {
  id: string;
  productName: string;
  variantName: string | null;
  productSlug: string | null;
  productImageUrl: string | null;
  quantity: number;
};

type PickupUser = {
  name: string;
  email: string;
};

type Pickup = SerializedPickup;

type PickupClientProps = {
  initialDashboard: PickupDashboardPayload;
  currentRole: UserRole;
};

export function PickupClient({
  initialDashboard,
  currentRole,
}: PickupClientProps) {
  const [query, setQuery] = useState("");
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [searchResults, setSearchResults] = useState<Pickup[] | null>(null);
  const [activeTab, setActiveTab] = useState<PickupDashboardTab>(() =>
    initialDashboard.counts.needsHandling > 0 ? "needsHandling" : "readyForPickup",
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshFlash, setRefreshFlash] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activePickupId, setActivePickupId] = useState<string | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedPickupId, setSelectedPickupId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tabPickups = dashboard[activeTab];
  const totalForTab = dashboard.counts[activeTab];

  const refreshDashboard = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/pickups/dashboard", {
        cache: "no-store",
      });
      const data = (await response.json()) as
        | PickupDashboardPayload
        | { error?: string };

      if (!response.ok) {
        return false;
      }

      if ("needsHandling" in data && "readyForPickup" in data) {
        setDashboard(data);
        setRefreshFlash(true);
        window.setTimeout(() => setRefreshFlash(false), 1500);
        return true;
      }

      return false;
    } catch {
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshDashboard();
    }, PICKUP_DASHBOARD_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, [refreshDashboard]);

  const popupPickups = useMemo(() => {
    if (selectedPickupId) {
      const fromTab = tabPickups.find((p) => p.id === selectedPickupId);
      if (fromTab) {
        return [fromTab];
      }
      const fromSearch = searchResults?.find((p) => p.id === selectedPickupId);
      if (fromSearch) {
        return [fromSearch];
      }
    }
    return searchResults ?? [];
  }, [searchResults, selectedPickupId, tabPickups]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSearching(true);
    setMessage(null);
    setError(null);
    setPopupOpen(false);
    setSelectedPickupId(null);

    try {
      const response = await fetch(`/api/pickups?q=${encodeURIComponent(query)}`);
      const data = (await response.json()) as Pickup[] | { error?: string };

      if (!response.ok) {
        setError(
          "error" in data && data.error
            ? data.error
            : "Kunde inte söka upphämtningar",
        );
        return;
      }

      if (!Array.isArray(data)) {
        setError("Kunde inte läsa upphämtningssvaret.");
        return;
      }

      setSearchResults(data);

      if (data.length === 0) {
        setError("Ingen upphämtning hittades.");
        return;
      }

      setPopupOpen(true);
    } catch {
      setError("Något gick fel vid sökningen");
    } finally {
      setIsSearching(false);
    }
  }

  async function completePickup(pickupId: string) {
    setActivePickupId(pickupId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/pickups/${pickupId}/complete`, {
        method: "PATCH",
      });
      const data = (await response.json()) as Pickup | { error?: string };

      if (!response.ok) {
        setError(
          "error" in data && data.error
            ? data.error
            : "Kunde inte markera upphämtningen",
        );
        return;
      }

      if (!("id" in data)) {
        setError("Kunde inte läsa den uppdaterade upphämtningen.");
        return;
      }

      await applyPickupUpdate(data);
      setMessage("Upphämtningen är markerad som hämtad");
    } catch {
      setError("Något gick fel när upphämtningen skulle sparas");
    } finally {
      setActivePickupId(null);
    }
  }

  async function cancelPickup(pickupId: string) {
    const shouldCancel = window.confirm(
      "Avbryt den här ordern? Den kommer inte längre kunna markeras som hämtad.",
    );

    if (!shouldCancel) {
      return;
    }

    setActivePickupId(pickupId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/pickups/${pickupId}/cancel`, {
        method: "PATCH",
      });
      const data = (await response.json()) as Pickup | { error?: string };

      if (!response.ok) {
        setError(
          "error" in data && data.error
            ? data.error
            : "Kunde inte avbryta ordern",
        );
        return;
      }

      if (!("id" in data)) {
        setError("Kunde inte läsa den avbrutna ordern.");
        return;
      }

      await applyPickupUpdate(data);
      setMessage("Ordern är avbruten");
    } catch {
      setError("Något gick fel när ordern skulle avbrytas");
    } finally {
      setActivePickupId(null);
    }
  }

  async function applyPickupUpdate(updatedPickup: Pickup) {
    setSearchResults((current) =>
      current
        ? current.map((pickup) =>
            pickup.id === updatedPickup.id ? updatedPickup : pickup,
          )
        : null,
    );
    await refreshDashboard();
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Order
        </p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-900">
          Upphämtningar
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Flikarna uppdateras varje minut. Sök nedan på kod, kund eller produkt.
        </p>

        <PickupDashboardTabs
          activeTab={activeTab}
          counts={dashboard.counts}
          fetchedAt={dashboard.fetchedAt}
          isRefreshing={isRefreshing}
          refreshFlash={refreshFlash}
          onRefreshNow={() => void refreshDashboard()}
          onSelectTab={setActiveTab}
        />
      </div>

      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4"
      >
        <label
          className="text-sm font-semibold text-zinc-700"
          htmlFor="pickup-search"
        >
          Sök eller scanna
        </label>
        <input
          id="pickup-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-12 rounded-lg border border-zinc-200 px-3 text-base outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
          placeholder="Kod, kund, produkt eller https-länk"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="min-h-12 cursor-pointer rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none"
        >
          {isSearching ? "Söker..." : "Sök upphämtning"}
        </button>
      </form>

      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2 px-1 text-xs text-zinc-500">
        <p>
          Visar {tabPickups.length} av {totalForTab} ordrar i &quot;
          {PICKUP_TAB_LABELS[activeTab]}&quot;
          {totalForTab > PICKUP_DASHBOARD_LIMIT
            ? ` (max ${PICKUP_DASHBOARD_LIMIT} senaste ordrar i listan)`
            : " · senaste först"}
        </p>
      </div>

      <PickupList
        pickups={tabPickups}
        emptyLabel={
          activeTab === "needsHandling"
            ? "Inga order behöver hanteras just nu."
            : "Inga order redo att hämtas just nu."
        }
        activePickupId={activePickupId}
        currentRole={currentRole}
        onCancel={cancelPickup}
        onComplete={completePickup}
        onOpenPopup={(pickupId) => {
          setSelectedPickupId(pickupId);
          setPopupOpen(true);
        }}
      />

      {popupOpen ? (
        <PickupPopup
          pickups={popupPickups}
          activePickupId={activePickupId}
          currentRole={currentRole}
          onCancel={cancelPickup}
          onClose={() => {
            setPopupOpen(false);
            setSelectedPickupId(null);
          }}
          onComplete={completePickup}
        />
      ) : null}
    </section>
  );
}

function PickupDashboardTabs({
  activeTab,
  counts,
  fetchedAt,
  isRefreshing,
  refreshFlash,
  onRefreshNow,
  onSelectTab,
}: {
  activeTab: PickupDashboardTab;
  counts: PickupDashboardPayload["counts"];
  fetchedAt: string;
  isRefreshing: boolean;
  refreshFlash: boolean;
  onRefreshNow: () => void;
  onSelectTab: (tab: PickupDashboardTab) => void;
}) {
  const tabs: PickupDashboardTab[] = ["needsHandling", "readyForPickup"];

  return (
    <div className="mt-4 flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {tabs.map((tab) => {
          const count = counts[tab];
          const isActive = activeTab === tab;
          const shouldBlink = count > 0;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => onSelectTab(tab)}
              className={`relative min-h-14 cursor-pointer rounded-xl border-2 px-3 py-2 text-left transition ${
                isActive && !shouldBlink
                  ? "border-orange-400 bg-orange-50 shadow-sm"
                  : !shouldBlink
                    ? "border-zinc-200 bg-zinc-50 hover:border-orange-200"
                    : ""
              } ${shouldBlink ? "pickup-tab-blink" : ""}`}
            >
              {shouldBlink ? (
                <span
                  className="pickup-tab-dot absolute top-2 right-2 size-3 rounded-full bg-orange-600 ring-2 ring-white"
                  aria-hidden
                />
              ) : null}
              <p
                className={`text-xs font-bold uppercase tracking-wide ${
                  isActive ? "text-orange-700" : "text-zinc-500"
                }`}
              >
                {PICKUP_TAB_LABELS[tab]}
              </p>
              <p
                className={`mt-0.5 text-2xl font-bold tabular-nums ${
                  isActive ? "text-zinc-900" : "text-zinc-700"
                }`}
              >
                {count}
              </p>
            </button>
          );
        })}
      </div>
      <div
        className={`flex flex-col items-center gap-2 rounded-lg px-2 py-2 ${
          refreshFlash ? "pickup-refresh-flash" : ""
        }`}
      >
        <p
          className={`text-center text-xs ${
            refreshFlash
              ? "font-semibold text-emerald-700"
              : isRefreshing
                ? "font-medium text-orange-600"
                : "text-zinc-500"
          }`}
        >
          {isRefreshing
            ? "Uppdaterar listan..."
            : refreshFlash
              ? `Uppdaterad ${formatDate(fetchedAt)}`
              : `Senast uppdaterad ${formatDate(fetchedAt)} · auto varje minut`}
        </p>
        <button
          type="button"
          onClick={onRefreshNow}
          disabled={isRefreshing}
          className="min-h-9 cursor-pointer rounded-lg border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 transition hover:border-orange-300 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRefreshing ? "Hämtar..." : "Uppdatera nu"}
        </button>
      </div>
    </div>
  );
}

function PickupList({
  pickups,
  emptyLabel,
  activePickupId,
  currentRole,
  onCancel,
  onComplete,
  onOpenPopup,
}: {
  pickups: Pickup[];
  emptyLabel: string;
  activePickupId: string | null;
  currentRole: UserRole;
  onCancel: (pickupId: string) => void;
  onComplete: (pickupId: string) => void;
  onOpenPopup: (pickupId: string) => void;
}) {
  if (pickups.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {pickups.map((pickup) => (
        <PickupCard
          key={pickup.id}
          pickup={pickup}
          isSaving={activePickupId === pickup.id}
          currentRole={currentRole}
          onCancel={onCancel}
          onComplete={onComplete}
          onOpenPopup={onOpenPopup}
        />
      ))}
    </div>
  );
}

function PickupPopup({
  pickups,
  activePickupId,
  currentRole,
  onCancel,
  onClose,
  onComplete,
}: {
  pickups: Pickup[];
  activePickupId: string | null;
  currentRole: UserRole;
  onCancel: (pickupId: string) => void;
  onClose: () => void;
  onComplete: (pickupId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-zinc-950/35 px-3 pb-3 pt-10">
      <section className="max-h-[88vh] w-full max-w-[430px] overflow-y-auto rounded-[2rem] bg-[#f3eee5] p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
              Upphämtning
            </p>
            <h3 className="mt-1 text-lg font-bold text-[#43342c]">
              Kontrollera ordern
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/80 text-sm font-bold text-zinc-500"
            aria-label="Stäng upphämtning"
          >
            x
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {pickups.map((pickup) => (
            <PickupInfoCard
              key={pickup.id}
              pickup={pickup}
              isSaving={activePickupId === pickup.id}
              currentRole={currentRole}
              onCancel={onCancel}
              onComplete={onComplete}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function PickupCard({
  pickup,
  isSaving,
  currentRole,
  onCancel,
  onComplete,
  onOpenPopup,
}: {
  pickup: Pickup;
  isSaving: boolean;
  currentRole: UserRole;
  onCancel: (pickupId: string) => void;
  onComplete: (pickupId: string) => void;
  onOpenPopup: (pickupId: string) => void;
}) {
  const canComplete = pickup.status === "READY";
  const canCancel = currentRole === "ADMIN" && pickup.status === "READY";

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <PickupItemImage item={pickup.items[0]} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-zinc-900">
              {pickup.customerName}
            </p>
            <StatusBadge status={pickup.status} />
          </div>
          <p className="mt-1 text-sm font-medium text-zinc-600">
            {pickup.pickupCode}
          </p>
          <p className="mt-1 line-clamp-1 text-sm text-zinc-500">
            {pickup.items.length > 0
              ? pickup.items.map(itemLabel).join(", ")
              : "Produktinfo saknas"}
          </p>
        </div>
      </div>

      {pickup.notes ? (
        <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm leading-6 text-zinc-500">
          {pickup.notes}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onOpenPopup(pickup.id)}
          className="min-h-10 cursor-pointer rounded-lg border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 transition hover:border-blue-200 hover:text-blue-700"
        >
          Visa
        </button>
        <button
          type="button"
          disabled={!canComplete || isSaving}
          onClick={() => onComplete(pickup.id)}
          className="min-h-10 cursor-pointer rounded-lg bg-accent px-3 text-sm font-semibold text-accent-foreground shadow-sm shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none"
        >
          {pickup.status === "PICKED_UP"
            ? "Hämtad"
            : isSaving
              ? "Sparar..."
              : "Markera hämtad"}
        </button>
      </div>

      {canCancel ? (
        <button
          type="button"
          disabled={isSaving}
          onClick={() => onCancel(pickup.id)}
          className="mt-2 min-h-10 w-full cursor-pointer rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Avbryt order
        </button>
      ) : null}

      <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-500 sm:grid-cols-2">
        <MetaBox label="Kundmail" value={pickup.customerEmail ?? "Saknas"} />
        <MetaBox label="Mailstatus" value={mailStatusLabel(pickup)} />
        <MetaBox label="Skapad" value={formatDate(pickup.createdAt)} />
        <MetaBox label={historyLabel(pickup)} value={historyValue(pickup)} />
      </div>
    </article>
  );
}

function PickupInfoCard({
  pickup,
  isSaving,
  currentRole,
  onCancel,
  onComplete,
}: {
  pickup: Pickup;
  isSaving: boolean;
  currentRole: UserRole;
  onCancel: (pickupId: string) => void;
  onComplete: (pickupId: string) => void;
}) {
  const canComplete = pickup.status === "READY";
  const canCancel = currentRole === "ADMIN" && pickup.status === "READY";

  return (
    <article className="rounded-[1.75rem] border border-[#dfd4c6] bg-[#f8f4ed] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-bold leading-6 text-[#43342c]">
            {pickup.customerName}
          </p>
          <p className="mt-1 text-sm font-bold text-orange-700">
            {pickup.pickupCode}
          </p>
        </div>
        <StatusBadge status={pickup.status} />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {pickup.items.length > 0 ? (
          pickup.items.map((item) => (
            <PickupProductRow key={item.id} item={item} />
          ))
        ) : (
          <p className="rounded-2xl bg-white px-3 py-4 text-sm text-[#75675d]">
            Produktinfo saknas för den här upphämtningen.
          </p>
        )}
      </div>

      {pickup.notes ? (
        <p className="mt-4 rounded-2xl bg-[#f3eee5] px-3 py-3 text-sm leading-6 text-[#75675d]">
          {pickup.notes}
        </p>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#dfd4c6]">
        <ProductFact label="Kundmail" value={pickup.customerEmail ?? "Saknas"} />
        <ProductFact label="Mailstatus" value={mailStatusLabel(pickup)} />
        <ProductFact label="Skapad" value={formatDate(pickup.createdAt)} />
        <ProductFact label={historyLabel(pickup)} value={historyValue(pickup)} />
      </div>

      <button
        type="button"
        disabled={!canComplete || isSaving}
        onClick={() => onComplete(pickup.id)}
        className="mt-4 min-h-12 w-full cursor-pointer rounded-xl bg-orange-500 px-4 text-sm font-bold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pickup.status === "PICKED_UP"
          ? "Redan hämtad"
          : isSaving
            ? "Sparar..."
            : "Markera hämtad"}
      </button>

      {canCancel ? (
        <button
          type="button"
          disabled={isSaving}
          onClick={() => onCancel(pickup.id)}
          className="mt-2 min-h-12 w-full cursor-pointer rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Avbryt order
        </button>
      ) : null}
    </article>
  );
}

function PickupProductRow({ item }: { item: PickupItem }) {
  return (
    <div className="grid grid-cols-[72px_1fr] gap-3 rounded-2xl bg-white p-3">
      <PickupItemImage item={item} large />
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-bold text-[#43342c]">
          {itemLabel(item)}
        </p>
        <p className="mt-1 text-xs font-semibold text-orange-700">
          Antal: {item.quantity}
        </p>
        {item.productSlug ? (
          <p className="mt-2 truncate text-xs text-[#75675d]">
            Slug: {item.productSlug}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PickupItemImage({
  item,
  large = false,
}: {
  item: PickupItem | undefined;
  large?: boolean;
}) {
  const sizeClass = large ? "size-[72px] rounded-2xl" : "size-14 rounded-xl";

  if (!item?.productImageUrl) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center bg-orange-50 text-[10px] font-bold text-orange-700 ${sizeClass}`}
      >
        Bild
      </div>
    );
  }

  return (
    <div
      aria-label={item.productName}
      role="img"
      className={`shrink-0 border border-[#dfd4c6] bg-white bg-contain bg-center bg-no-repeat ${sizeClass}`}
      style={{ backgroundImage: `url("${item.productImageUrl}")` }}
    />
  );
}

function itemLabel(item: PickupItem): string {
  return item.variantName
    ? `${item.productName} - ${item.variantName}`
    : item.productName;
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-zinc-50 px-3 py-2">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-0.5 truncate text-lg font-semibold text-zinc-900">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: PickupStatus }) {
  const labels: Record<PickupStatus, string> = {
    READY: "Redo",
    PICKED_UP: "Hämtad",
    CANCELLED: "Avbruten",
  };

  const className =
    status === "READY"
      ? "bg-emerald-50 text-emerald-700"
      : status === "PICKED_UP"
        ? "bg-zinc-100 text-zinc-600"
        : "bg-red-50 text-red-700";

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${className}`}>
      {labels[status]}
    </span>
  );
}

function MetaBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-zinc-50 px-3 py-2">
      <p className="font-medium text-zinc-400">{label}</p>
      <p className="mt-0.5 truncate text-zinc-700">{value}</p>
    </div>
  );
}

function ProductFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#dfd4c6] bg-[#f3eee5] px-3 py-2 text-xs last:border-b-0">
      <p className="font-bold text-[#6a5b50]">{label}</p>
      <p className="max-w-40 break-words text-right font-bold text-blue-700">
        {value}
      </p>
    </div>
  );
}

function mailStatusLabel(pickup: Pickup): string {
  if (pickup.readyEmailSentAt) {
    return `Skickat ${formatDate(pickup.readyEmailSentAt)}`;
  }

  if (!pickup.customerEmail) {
    return "Kundmail saknas – hantera manuellt";
  }

  return "Väntar på bekräftelsemail";
}

function historyLabel(pickup: Pickup): string {
  if (pickup.status === "CANCELLED") {
    return "Avbruten";
  }

  return "Utlämnad";
}

function historyValue(pickup: Pickup): string {
  if (pickup.status === "CANCELLED") {
    return pickup.cancelledAt
      ? `${formatDate(pickup.cancelledAt)} av ${pickup.cancelledBy?.name ?? "okänd"}`
      : "-";
  }

  return pickup.pickedUpAt
    ? `${formatDate(pickup.pickedUpAt)} av ${pickup.pickedUpBy?.name ?? "okänd"}`
    : "-";
}

function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
