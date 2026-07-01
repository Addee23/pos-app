"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Role } from "@/generated/prisma/client";
import { useToast } from "@/components/ui/ToastProvider";

type StoreOption = { id: string; name: string };

type ManagedUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  storeId: string | null;
  createdAt: string;
  store: StoreOption | null;
};

type RoleFilter = "ALL" | "ADMIN" | "PERSONAL";

type UserManagementClientProps = {
  initialUsers: ManagedUser[];
  stores: StoreOption[];
  currentUserId: string;
};

export function UserManagementClient({
  initialUsers,
  stores,
  currentUserId,
}: UserManagementClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [users, setUsers] = useState(initialUsers);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const createInFlight = useRef(false);
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [storeFilter, setStoreFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    const matchesRole =
      roleFilter === "ALL" ||
      (roleFilter === "ADMIN" && u.role === "ADMIN") ||
      (roleFilter === "PERSONAL" && u.role === "PERSONAL");
    const matchesStore =
      storeFilter === "ALL" || u.storeId === storeFilter;
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.store?.name ?? "").toLowerCase().includes(q);
    return matchesRole && matchesStore && matchesQuery;
  });

  async function createUser(formData: FormData) {
    if (createInFlight.current) return;
    createInFlight.current = true;
    setCreating(true);
    const body = {
      email: formData.get("email"),
      name: formData.get("name"),
      password: formData.get("password"),
      role: formData.get("role"),
      storeId: formData.get("storeId"),
    };
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Kunde inte skapa användaren"); return; }
      setUsers((prev) => [...prev, data]);
      setShowCreate(false);
      toast.success("Användaren skapades.");
      router.refresh();
    } catch {
      toast.error("Något gick fel. Försök igen.");
    } finally {
      createInFlight.current = false;
      setCreating(false);
    }
  }

  async function updateUser(userId: string, formData: FormData) {
    setSavingUserId(userId);
    const body = {
      name: formData.get("name"),
      role: formData.get("role"),
      storeId: formData.get("storeId"),
    };
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Kunde inte uppdatera"); return; }
      setUsers((prev) => prev.map((u) => (u.id === data.id ? data : u)));
      setEditingId(null);
      toast.success("Användaren uppdaterades.");
      router.refresh();
    } catch {
      toast.error("Något gick fel. Försök igen.");
    } finally {
      setSavingUserId(null);
    }
  }

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const personalCount = users.filter((u) => u.role === "PERSONAL").length;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 min-w-40">
          <svg className="size-4 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök namn, e-post eller butik..."
            className="flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
          />
        </div>

        {stores.length > 1 && (
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none"
          >
            <option value="ALL">Alla butiker</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        <div className="flex gap-1 rounded-xl border border-zinc-200 bg-white p-1">
          {(["ALL", "ADMIN", "PERSONAL"] as RoleFilter[]).map((r) => {
            const label = r === "ALL" ? `Alla (${users.length})` : r === "ADMIN" ? `Admin (${adminCount})` : `Personal (${personalCount})`;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  roleFilter === r
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="ml-auto flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700"
        >
          <span className="text-base leading-none">+</span>
          Lägg till användare
        </button>
      </div>

      {/* User list */}
      <div className="flex flex-col gap-1.5">
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
            Inga användare matchade sökningen.
          </p>
        ) : (
          filtered.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              stores={stores}
              currentUserId={currentUserId}
              isExpanded={expandedId === user.id}
              isEditing={editingId === user.id}
              isSaving={savingUserId === user.id}
              onToggle={() => {
                setExpandedId((prev) => (prev === user.id ? null : user.id));
                setEditingId(null);
              }}
              onEdit={() => setEditingId(user.id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={(formData) => updateUser(user.id, formData)}
            />
          ))
        )}
      </div>

      {/* Create user popup */}
      {showCreate ? (
        <CreateUserPopup
          stores={stores}
          creating={creating}
          onClose={() => setShowCreate(false)}
          onSubmit={createUser}
        />
      ) : null}
    </div>
  );
}

function UserRow({
  user,
  stores,
  currentUserId,
  isExpanded,
  isEditing,
  isSaving,
  onToggle,
  onEdit,
  onCancelEdit,
  onSave,
}: {
  user: ManagedUser;
  stores: StoreOption[];
  currentUserId: string;
  isExpanded: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (formData: FormData) => void;
}) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {/* Row header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-50"
      >
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          user.role === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-blue-50 text-blue-700"
        }`}>
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900">{user.name}</p>
          <p className="truncate text-xs text-zinc-500">{user.email}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
          user.role === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-blue-50 text-blue-700"
        }`}>
          {user.role === "ADMIN" ? "Admin" : "Personal"}
        </span>
        <span className="shrink-0 hidden text-xs text-zinc-400 sm:block">
          {user.store?.name ?? "—"}
        </span>
        <svg
          className={`size-4 shrink-0 text-zinc-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded ? (
        <div className="border-t border-zinc-100 px-3 pb-3 pt-3">
          {!isEditing ? (
            /* Read-only view */
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <InfoPill label="Butik" value={user.store?.name ?? "—"} />
                <InfoPill label="Roll" value={user.role === "ADMIN" ? "Admin" : "Personal"} />
                <InfoPill label="E-post" value={user.email} />
                <InfoPill label="Skapad" value={formatDate(user.createdAt)} />
              </div>
              <button
                type="button"
                onClick={onEdit}
                className="mt-1 w-full rounded-lg border border-zinc-200 py-2 text-xs font-semibold text-zinc-700 transition hover:border-violet-300 hover:text-violet-700"
              >
                Redigera
              </button>
            </div>
          ) : (
            /* Edit form */
            <form action={onSave} className="flex flex-col gap-3">
              <CompactField label="Namn" name="name" defaultValue={user.name} placeholder="Namn" />
              <CompactRoleSelect name="role" defaultValue={user.role} disabled={user.id === currentUserId} />
              <CompactStoreSelect stores={stores} defaultValue={user.storeId ?? stores[0]?.id ?? ""} />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="flex-1 rounded-lg border border-zinc-200 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 rounded-lg bg-violet-600 py-2 text-xs font-bold text-white transition hover:bg-violet-700 disabled:bg-zinc-300"
                >
                  {isSaving ? "Sparar..." : "Spara"}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CreateUserPopup({
  stores,
  creating,
  onClose,
  onSubmit,
}: {
  stores: StoreOption[];
  creating: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-90 flex items-end justify-center bg-zinc-950/35 px-3 pb-3 pt-10 lg:items-center lg:p-6"
      onClick={onClose}
    >
      <section
        className="w-full max-w-md overflow-y-auto rounded-4xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900">Lägg till användare</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-500 hover:bg-zinc-200"
          >
            ×
          </button>
        </div>

        <form action={onSubmit} className="flex flex-col gap-3">
          <CompactField label="Namn" name="name" placeholder="t.ex. Anna Andersson" autoComplete="name" />
          <CompactField label="E-post" name="email" type="email" placeholder="anna@butik.se" autoComplete="email" />
          <CompactField label="Lösenord" name="password" type="password" placeholder="Minst 8 tecken" autoComplete="new-password" />
          <CompactRoleSelect name="role" defaultValue="PERSONAL" />
          <CompactStoreSelect stores={stores} defaultValue={stores[0]?.id ?? ""} />
          <button
            type="submit"
            disabled={creating || stores.length === 0}
            className="mt-1 min-h-11 w-full cursor-pointer rounded-xl bg-violet-600 text-sm font-bold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none"
          >
            {creating ? "Skapar..." : "Skapa användare"}
          </button>
        </form>
      </section>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-2.5 py-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-zinc-700">{value}</p>
    </div>
  );
}

function CompactField({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-600">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="min-h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-500/10"
      />
    </label>
  );
}

function CompactRoleSelect({
  name,
  defaultValue,
  disabled = false,
}: {
  name: string;
  defaultValue: Role;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-600">
      Roll
      {disabled ? <input type="hidden" name={name} value={defaultValue} /> : null}
      <select
        name={disabled ? undefined : name}
        defaultValue={defaultValue}
        disabled={disabled}
        className="min-h-9 w-full cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:bg-zinc-100"
      >
        <option value="PERSONAL">Personal</option>
        <option value="ADMIN">Admin</option>
      </select>
    </label>
  );
}

function CompactStoreSelect({
  stores,
  defaultValue,
}: {
  stores: StoreOption[];
  defaultValue: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-600">
      Butik
      <select
        name="storeId"
        defaultValue={defaultValue}
        className="min-h-9 w-full cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-500/10"
      >
        {stores.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </label>
  );
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
