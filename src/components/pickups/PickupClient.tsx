"use client";

import { useMemo, useState } from "react";

type PickupStatus = "READY" | "PICKED_UP" | "CANCELLED";

type Pickup = {
  id: string;
  customerName: string;
  pickupCode: string;
  status: PickupStatus;
  notes: string | null;
  pickedUpAt: string | Date | null;
  createdAt: string | Date;
  pickedUpBy: {
    name: string;
    email: string;
  } | null;
};

type PickupClientProps = {
  initialPickups: Pickup[];
};

export function PickupClient({ initialPickups }: PickupClientProps) {
  const [query, setQuery] = useState("");
  const [pickups, setPickups] = useState(initialPickups);
  const [isSearching, setIsSearching] = useState(false);
  const [activePickupId, setActivePickupId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readyCount = useMemo(
    () => pickups.filter((pickup) => pickup.status === "READY").length,
    [pickups],
  );

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSearching(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/pickups?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Kunde inte söka upphämtningar");
        return;
      }

      setPickups(data);
      setMessage(`Hittade ${data.length} upphämtningar`);
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
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Kunde inte markera upphämtningen");
        return;
      }

      setPickups((currentPickups) =>
        currentPickups.map((pickup) =>
          pickup.id === data.id ? data : pickup,
        ),
      );
      setMessage("Upphämtningen är markerad som hämtad");
    } catch {
      setError("Något gick fel när upphämtningen skulle sparas");
    } finally {
      setActivePickupId(null);
    }
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
          Sök på kundnamn eller upphämtningskod. När kunden har fått sin order
          markerar du den som hämtad.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <SummaryBox label="Visas" value={String(pickups.length)} />
          <SummaryBox label="Redo" value={String(readyCount)} />
        </div>
      </div>

      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 sm:flex-row"
      >
        <label className="sr-only" htmlFor="pickup-search">
          Sök upphämtning
        </label>
        <input
          id="pickup-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-11 flex-1 rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-500"
          placeholder="Kundnamn eller kod, t.ex. HAMTA-1001"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="min-h-11 cursor-pointer rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none"
        >
          {isSearching ? "Söker..." : "Sök"}
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

      <PickupList
        pickups={pickups}
        activePickupId={activePickupId}
        onComplete={completePickup}
      />
    </section>
  );
}

function PickupList({
  pickups,
  activePickupId,
  onComplete,
}: {
  pickups: Pickup[];
  activePickupId: string | null;
  onComplete: (pickupId: string) => void;
}) {
  if (pickups.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
        Inga upphämtningar hittades. Prova kundnamn eller kod, till exempel
        HAMTA-1001.
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
          onComplete={onComplete}
        />
      ))}
    </div>
  );
}

function PickupCard({
  pickup,
  isSaving,
  onComplete,
}: {
  pickup: Pickup;
  isSaving: boolean;
  onComplete: (pickupId: string) => void;
}) {
  const isPickedUp = pickup.status === "PICKED_UP";

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-zinc-900">
              {pickup.customerName}
            </p>
            <StatusBadge status={pickup.status} />
          </div>
          <p className="mt-1 text-sm font-medium text-zinc-600">
            {pickup.pickupCode}
          </p>
          {pickup.notes ? (
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              {pickup.notes}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          disabled={isPickedUp || isSaving}
          onClick={() => onComplete(pickup.id)}
          className="min-h-10 cursor-pointer rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none"
        >
          {isPickedUp ? "Hämtad" : isSaving ? "Sparar..." : "Markera hämtad"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-zinc-500 sm:grid-cols-2">
        <MetaBox label="Skapad" value={formatDate(pickup.createdAt)} />
        <MetaBox
          label="Utlämnad"
          value={
            pickup.pickedUpAt
              ? `${formatDate(pickup.pickedUpAt)} av ${pickup.pickedUpBy?.name ?? "okänd"}`
              : "-"
          }
        />
      </div>
    </article>
  );
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

function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
