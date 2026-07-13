"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PICKUP_DASHBOARD_LIMIT,
  PICKUP_DASHBOARD_REFRESH_MS,
  PICKUP_TAB_LABELS,
  type PickupDashboardTab,
} from "@/lib/pickup-dashboard";
import type { PickupDashboardPayload } from "@/lib/pickup-dashboard-data";
import { useToast } from "@/components/ui/ToastProvider";
import type { SerializedPickup } from "@/lib/pickup-serialize";

type UserRole = "ADMIN" | "PERSONAL";

type PickupStatus = "AWAITING_PACK" | "READY" | "PICKED_UP" | "CANCELLED";

type PickupItem = {
  id: string;
  productName: string;
  variantName: string | null;
  productSlug: string | null;
  productImageUrl: string | null;
  quantity: number;
  stockLocation: string | null;
};


type Pickup = SerializedPickup;

type StoreOption = { id: string; name: string };

type PickupClientProps = {
  initialDashboard: PickupDashboardPayload;
  currentRole: UserRole;
  stores: StoreOption[];
};

export function PickupClient({
  initialDashboard,
  currentRole,
  stores,
}: PickupClientProps) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(
    stores.map((s) => s.id),
  );
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
  const allSelected = selectedStoreIds.length === stores.length;
  const tabPickups = (dashboard[activeTab] as Pickup[]).filter(
    (p) => allSelected || selectedStoreIds.includes(p.storeId),
  );
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

  async function handleSearch(event: { preventDefault(): void }) {
    event.preventDefault();
    setIsSearching(true);
    setPopupOpen(false);
    setSelectedPickupId(null);

    try {
      const response = await fetch(`/api/pickups?q=${encodeURIComponent(query)}`);
      const data = (await response.json()) as Pickup[] | { error?: string };

      if (!response.ok) {
        toast.error(
          "error" in data && data.error
            ? data.error
            : "Kunde inte söka upphämtningar",
        );
        return;
      }

      if (!Array.isArray(data)) {
        toast.error("Kunde inte läsa upphämtningssvaret.");
        return;
      }

      setSearchResults(data);

      if (data.length === 0) {
        toast.error("Ingen upphämtning hittades.");
        return;
      }

      setPopupOpen(true);
    } catch {
      toast.error("Något gick fel vid sökningen");
    } finally {
      setIsSearching(false);
    }
  }

  async function packPickup(pickupId: string) {
    setActivePickupId(pickupId);

    try {
      const response = await fetch(`/api/pickups/${pickupId}/pack`, {
        method: "PATCH",
      });
      const data = (await response.json()) as
        | { pickup?: Pickup; message?: string; error?: string }
        | { error?: string };

      if (!response.ok) {
        toast.error(
          "error" in data && data.error
            ? data.error
            : "Kunde inte markera ordern som packad",
        );
        return;
      }

      if (!("pickup" in data) || !data.pickup) {
        toast.error("Kunde inte läsa den packade ordern.");
        return;
      }

      await applyPickupUpdate(data.pickup);
      toast.success(
        data.message ?? "Ordern är packad och kunden har fått bekräftelse",
      );
    } catch {
      toast.error("Något gick fel när ordern skulle packas");
    } finally {
      setActivePickupId(null);
    }
  }

  async function completePickup(pickupId: string) {
    setActivePickupId(pickupId);

    try {
      const response = await fetch(`/api/pickups/${pickupId}/complete`, {
        method: "PATCH",
      });
      const data = (await response.json()) as Pickup | { error?: string };

      if (!response.ok) {
        toast.error(
          "error" in data && data.error
            ? data.error
            : "Kunde inte markera upphämtningen",
        );
        return;
      }

      if (!("id" in data)) {
        toast.error("Kunde inte läsa den uppdaterade upphämtningen.");
        return;
      }

      await applyPickupUpdate(data);
      toast.success("Upphämtningen är markerad som hämtad");
    } catch {
      toast.error("Något gick fel när upphämtningen skulle sparas");
    } finally {
      setActivePickupId(null);
    }
  }

  async function cancelPickup(pickupId: string) {
    toast.confirm(
      "Avbryt den här ordern? Den kommer inte längre kunna markeras som hämtad.",
      () => void doCancel(pickupId),
      { confirmLabel: "Ja, avbryt order", cancelLabel: "Nej, behåll" },
    );
  }

  async function doCancel(pickupId: string) {
    setActivePickupId(pickupId);

    try {
      const response = await fetch(`/api/pickups/${pickupId}/cancel`, {
        method: "PATCH",
      });
      const data = (await response.json()) as Pickup | { error?: string };

      if (!response.ok) {
        toast.error(
          "error" in data && data.error
            ? data.error
            : "Kunde inte avbryta ordern",
        );
        return;
      }

      if (!("id" in data)) {
        toast.error("Kunde inte läsa den avbrutna ordern.");
        return;
      }

      await applyPickupUpdate(data);
      toast.success("Ordern är avbruten");
    } catch {
      toast.error("Något gick fel när ordern skulle avbrytas");
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

        {stores.length > 1 && (
          <div className="mt-3 flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-zinc-500">Visa butik(er)</p>
            <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 p-2.5">
              <CircleCheckLabel
                checked={allSelected}
                onChange={(checked) =>
                  setSelectedStoreIds(checked ? stores.map((s) => s.id) : [])
                }
                label="Alla butiker"
                bold
              />
              {stores.map((store) => (
                <CircleCheckLabel
                  key={store.id}
                  checked={selectedStoreIds.includes(store.id)}
                  onChange={() =>
                    setSelectedStoreIds((prev) =>
                      prev.includes(store.id)
                        ? prev.filter((id) => id !== store.id)
                        : [...prev, store.id],
                    )
                  }
                  label={store.name}
                />
              ))}
            </div>
          </div>
        )}

        <PickupDashboardTabs
          activeTab={activeTab}
          counts={dashboard.counts}
          readyForPickupItems={dashboard.readyForPickup}
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
        <div className="flex flex-col gap-1">
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
            className="min-h-12 rounded-lg border border-zinc-200 px-3 text-base outline-none placeholder:text-zinc-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
            placeholder="Kod, kund, produkt eller https-länk"
            aria-describedby="pickup-search-hint"
          />
          <span id="pickup-search-hint" className="text-xs font-normal leading-5 text-zinc-500">
            Sök på upphämtningskod, kundnamn, produkt eller klistra in orderlänk från WooCommerce.
          </span>
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="min-h-12 cursor-pointer rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none"
        >
          {isSearching ? "Söker..." : "Sök upphämtning"}
        </button>
      </form>

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
            ? "Inga order väntar på packning just nu."
            : "Inga order redo att hämtas just nu."
        }
        activePickupId={activePickupId}
        currentRole={currentRole}
        onCancel={cancelPickup}
        onPack={packPickup}
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
          onPack={packPickup}
        />
      ) : null}
    </section>
  );
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function PickupDashboardTabs({
  activeTab,
  counts,
  readyForPickupItems,
  fetchedAt,
  isRefreshing,
  refreshFlash,
  onRefreshNow,
  onSelectTab,
}: {
  activeTab: PickupDashboardTab;
  counts: PickupDashboardPayload["counts"];
  readyForPickupItems: PickupDashboardPayload["readyForPickup"];
  fetchedAt: string;
  isRefreshing: boolean;
  refreshFlash: boolean;
  onRefreshNow: () => void;
  onSelectTab: (tab: PickupDashboardTab) => void;
}) {
  const tabs: PickupDashboardTab[] = ["needsHandling", "readyForPickup"];

  const hasOverdueReady = readyForPickupItems.some((p) => {
    const since = p.packedAt ?? p.createdAt;
    return Date.now() - new Date(since).getTime() > ONE_WEEK_MS;
  });

  return (
    <div className="mt-4 flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {tabs.map((tab) => {
          const count = counts[tab];
          const isActive = activeTab === tab;
          const shouldBlink =
            tab === "needsHandling" ? count > 0 : hasOverdueReady;

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
  onPack,
  onComplete,
  onOpenPopup,
}: {
  pickups: Pickup[];
  emptyLabel: string;
  activePickupId: string | null;
  currentRole: UserRole;
  onCancel: (pickupId: string) => void;
  onPack: (pickupId: string) => void;
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
          onPack={onPack}
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
  onPack,
}: {
  pickups: Pickup[];
  activePickupId: string | null;
  currentRole: UserRole;
  onCancel: (pickupId: string) => void;
  onClose: () => void;
  onPack: (pickupId: string) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-90 flex items-end justify-center bg-zinc-950/35 px-3 pb-3 pt-10 lg:items-center lg:p-6" onClick={onClose}>
      <section className="max-h-[88vh] w-full max-w-107.5 overflow-y-auto rounded-4xl bg-[#f3eee5] p-4 shadow-2xl lg:max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
              Upphämtning
            </p>
            <h3 className="mt-1 text-lg font-bold text-[#43342c]">
              Plocklista
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/upphamtning/print?id=${pickups.map((p) => p.id).join(",")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer rounded-xl border border-[#dfd4c6] bg-white px-3 py-2 text-xs font-bold text-[#43342c] transition hover:border-orange-300 hover:text-orange-700"
            >
              Skriv ut plocklista
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/80 text-sm font-bold text-zinc-500"
              aria-label="Stäng upphämtning"
            >
              x
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 print:hidden">
          {pickups.map((pickup) => (
            <PickupInfoCard
              key={pickup.id}
              pickup={pickup}
              isSaving={activePickupId === pickup.id}
              currentRole={currentRole}
              onCancel={onCancel}
              onPack={onPack}
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
  onPack,
  onComplete,
  onOpenPopup,
}: {
  pickup: Pickup;
  isSaving: boolean;
  currentRole: UserRole;
  onCancel: (pickupId: string) => void;
  onPack: (pickupId: string) => void;
  onComplete: (pickupId: string) => void;
  onOpenPopup: (pickupId: string) => void;
}) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const canPack = pickup.status === "AWAITING_PACK";
  const canComplete = pickup.status === "READY";
  const canCancel =
    currentRole === "ADMIN" &&
    (pickup.status === "AWAITING_PACK" || pickup.status === "READY");

  const firstItemImage = pickup.items[0]?.productImageUrl ?? null;

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4">
      {zoomedImage ? (
        <ImageLightbox imageUrl={zoomedImage} onClose={() => setZoomedImage(null)} />
      ) : null}
      <div className="flex gap-3">
        {firstItemImage ? (
          <button
            type="button"
            onClick={() => setZoomedImage(firstItemImage)}
            aria-label="Förstora produktbild"
            className="size-14 shrink-0 cursor-pointer rounded-xl border border-[#dfd4c6] bg-white bg-contain bg-center bg-no-repeat transition-opacity hover:opacity-75"
            style={{ backgroundImage: `url("${firstItemImage}")` }}
          />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[10px] font-bold text-orange-700">
            Bild
          </div>
        )}
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

      <div className={`mt-4 grid gap-2 ${canPack ? "grid-cols-1" : "grid-cols-2"}`}>
        <button
          type="button"
          onClick={() => onOpenPopup(pickup.id)}
          className="min-h-10 cursor-pointer rounded-lg border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 transition hover:border-blue-200 hover:text-blue-700"
        >
          Visa
        </button>
        {!canPack && (
          <button
            type="button"
            disabled={!canComplete || isSaving}
            onClick={() => onComplete(pickup.id)}
            className="min-h-10 cursor-pointer rounded-lg bg-accent px-3 text-sm font-semibold text-accent-foreground shadow-sm shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none"
          >
            {pickup.status === "PICKED_UP"
              ? "✓ Hämtad"
              : isSaving
                ? "Sparar..."
                : "Markera hämtad"}
          </button>
        )}
      </div>

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
  onPack,
}: {
  pickup: Pickup;
  isSaving: boolean;
  currentRole: UserRole;
  onCancel: (pickupId: string) => void;
  onPack: (pickupId: string) => void;
}) {
  const toast = useToast();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [packConfirmPending, setPackConfirmPending] = useState(false);
  const canPack = pickup.status === "AWAITING_PACK";
  const canCancel =
    currentRole === "ADMIN" &&
    (pickup.status === "AWAITING_PACK" || pickup.status === "READY");

  function toggleItem(id: string) {
    setPackConfirmPending(false);
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handlePackClick(action: () => void) {
    const total = pickup.items.length;
    const checked = checkedItems.size;
    if (total > 0 && checked < total) {
      if (!packConfirmPending) {
        toast.warning(
          `${checked} av ${total} varor är avprickade. Gå tillbaka och pricka av resten, eller klicka igen för att packa ändå.`,
        );
        setPackConfirmPending(true);
        return;
      }
    }
    setPackConfirmPending(false);
    action();
  }

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
            <PickupProductRow
              key={item.id}
              item={item}
              checked={checkedItems.has(item.id)}
              onToggle={() => toggleItem(item.id)}
            />
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
        {pickup.packedAt ? (
          <ProductFact
            label="Packad"
            value={`${formatDate(pickup.packedAt)} av ${pickup.packedBy?.name ?? "okänd"}`}
          />
        ) : null}
        <ProductFact label={historyLabel(pickup)} value={historyValue(pickup)} />
      </div>

      {canPack ? (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
          <CircleCheckLabel
            checked={isSaving}
            onChange={() => !isSaving && handlePackClick(() => onPack(pickup.id))}
            label={
              isSaving
                ? "Packar..."
                : packConfirmPending
                  ? "Klicka igen för att packa ändå"
                  : "Markera som packad och skicka mail"
            }
            bold
          />
        </div>
      ) : null}

    </article>
  );
}

function PickupProductRow({
  item,
  checked,
  onToggle,
}: {
  item: PickupItem;
  checked: boolean;
  onToggle?: () => void;
}) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl p-3 transition ${onToggle ? "cursor-pointer" : ""} ${checked ? "bg-emerald-50" : "bg-white"}`}
      onClick={onToggle}
    >
      {zoomedImage ? (
        <ImageLightbox imageUrl={zoomedImage} onClose={() => setZoomedImage(null)} />
      ) : null}

      {/* Rund produktbild till vänster */}
      {item.productImageUrl ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setZoomedImage(item.productImageUrl!); }}
          aria-label="Förstora produktbild"
          className="size-12 shrink-0 cursor-pointer rounded-full border border-[#dfd4c6] bg-white bg-cover bg-center transition-opacity hover:opacity-75"
          style={{ backgroundImage: `url("${item.productImageUrl}")` }}
        />
      ) : (
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[10px] font-bold text-orange-700">
          Bild
        </div>
      )}

      {/* Produktinfo i mitten */}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold transition ${checked ? "text-zinc-400 line-through" : "text-[#43342c]"}`}>
          {itemLabel(item)}
        </p>
        <p className={`mt-0.5 text-xs font-semibold ${checked ? "text-zinc-400" : "text-orange-700"}`}>
          {item.quantity} st
        </p>
        <p className={`mt-0.5 text-xs font-semibold ${item.stockLocation ? (checked ? "text-zinc-400" : "text-[#6a5b50]") : "text-zinc-400"}`}>
          Hylla: {item.stockLocation ?? "Saknas"}
        </p>
      </div>

      {/* Rund checkbox (CodePen-stil) */}
      {onToggle ? (
        <div
          className="relative size-7 shrink-0 rounded-full border transition-colors"
          style={{
            backgroundColor: checked ? "#66bb6a" : "#fff",
            borderColor: checked ? "#66bb6a" : "#ccc",
          }}
        >
          <div
            className="-rotate-45 border-b-2 border-l-2 border-white transition-opacity"
            style={{
              position: "absolute",
              left: 7,
              top: 8,
              width: 12,
              height: 6,
              opacity: checked ? 1 : 0,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}


function ImageLightbox({
  imageUrl,
  onClose,
}: {
  imageUrl: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/75 p-6"
      onClick={onClose}
    >
      <div
        className="flex size-72 items-center justify-center rounded-2xl bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Produktbild"
          className="size-full object-contain"
        />
      </div>
    </div>
  );
}

function itemLabel(item: PickupItem): string {
  return item.variantName
    ? `${item.productName} - ${item.variantName}`
    : item.productName;
}


function StatusBadge({ status }: { status: PickupStatus }) {
  const labels: Record<PickupStatus, string> = {
    AWAITING_PACK: "Ska packas",
    READY: "Redo",
    PICKED_UP: "Hämtad",
    CANCELLED: "Avbruten",
  };

  const className =
    status === "AWAITING_PACK"
      ? "bg-orange-50 text-orange-700"
      : status === "READY"
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
      <p className="max-w-40 wrap-break-word text-right font-bold text-blue-700">
        {value}
      </p>
    </div>
  );
}

function mailStatusLabel(pickup: Pickup): string {
  if (pickup.status === "AWAITING_PACK") {
    return pickup.customerEmail
      ? "Skickas när ordern markeras som packad"
      : "Kundmail saknas – meddela kunden manuellt";
  }

  if (pickup.readyEmailSentAt) {
    return `Skickat ${formatDate(pickup.readyEmailSentAt)}`;
  }

  if (!pickup.customerEmail) {
    return "Kundmail saknas – meddela kunden manuellt";
  }

  return "Mejl kunde inte skickas vid packning";
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

function CircleCheckLabel({
  checked,
  onChange,
  label,
  bold = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  bold?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-0.5">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div
        className="relative size-7 shrink-0 rounded-full border transition-colors"
        style={{
          backgroundColor: checked ? "#66bb6a" : "#fff",
          borderColor: checked ? "#66bb6a" : "#ccc",
        }}
      >
        <div
          className="-rotate-45 border-b-2 border-l-2 border-white transition-opacity"
          style={{
            position: "absolute",
            left: 7,
            top: 8,
            width: 12,
            height: 6,
            opacity: checked ? 1 : 0,
          }}
        />
      </div>
      <span className={`text-sm ${bold ? "font-semibold text-zinc-800" : "text-zinc-700"}`}>
        {label}
      </span>
    </label>
  );
}
