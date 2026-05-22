"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/generated/prisma/client";

type StoreOption = {
  id: string;
  name: string;
};

type ManagedUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  storeId: string | null;
  createdAt: string;
  store: StoreOption | null;
};

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
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  async function createUser(formData: FormData) {
    setCreating(true);
    setMessage(null);
    setError(null);

    const body = {
      email: formData.get("email"),
      name: formData.get("name"),
      password: formData.get("password"),
      role: formData.get("role"),
      storeId: formData.get("storeId"),
    };

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Kunde inte skapa användaren");
        return;
      }

      setUsers((currentUsers) => [...currentUsers, data]);
      setMessage("Användaren skapades.");
      router.refresh();
    } catch (error) {
      console.error(error);
      setError("Något gick fel vid anropet. Försök igen.");
    } finally {
      setCreating(false);
    }
  }

  async function updateUser(userId: string, formData: FormData) {
    setSavingUserId(userId);
    setMessage(null);
    setError(null);

    const body = {
      name: formData.get("name"),
      role: formData.get("role"),
      storeId: formData.get("storeId"),
    };

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Kunde inte uppdatera användaren");
        return;
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === data.id ? data : user)),
      );
      setMessage("Användaren uppdaterades.");
      router.refresh();
    } catch (error) {
      console.error(error);
      setError("Något gick fel vid anropet. Försök igen.");
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <SummaryBox label="Användare" value={String(users.length)} />
        <SummaryBox
          label="Admins"
          value={String(users.filter((user) => user.role === "ADMIN").length)}
        />
      </div>

      <form
        action={createUser}
        className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4"
      >
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            Ny användare
          </h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Fyll i namn, e-post, roll och butik. Lösenordet hash:as på servern
            innan användaren sparas.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Namn" name="name" autoComplete="name" />
          <Field label="E-post" name="email" type="email" autoComplete="email" />
          <Field
            label="Lösenord"
            name="password"
            type="password"
            autoComplete="new-password"
          />
          <RoleSelect name="role" defaultValue="PERSONAL" />
          <StoreSelect stores={stores} defaultValue={stores[0]?.id ?? ""} />
        </div>

        <button
          type="submit"
          disabled={creating || stores.length === 0}
          className="min-h-12 cursor-pointer rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {creating ? "Skapar..." : "Skapa användare"}
        </button>
      </form>

      {message ? <Alert type="success" message={message} /> : null}
      {error ? <Alert type="error" message={error} /> : null}

      <section className="flex flex-col gap-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-900">
            Befintliga användare
          </h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Här redigerar du användare som redan finns. E-post visas bara som
            läsbar information.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              stores={stores}
              currentUserId={currentUserId}
              isSaving={savingUserId === user.id}
              onSave={updateUser}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function UserCard({
  user,
  stores,
  currentUserId,
  isSaving,
  onSave,
}: {
  user: ManagedUser;
  stores: StoreOption[];
  currentUserId: string;
  isSaving: boolean;
  onSave: (userId: string, formData: FormData) => void;
}) {
  return (
    <form
      action={(formData) => onSave(user.id, formData)}
      className="rounded-lg border border-zinc-200 bg-white p-4"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-zinc-900">
            {user.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">{user.email}</p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
          {user.role === "ADMIN" ? "Admin" : "Personal"}
        </span>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Namn" name="name" defaultValue={user.name} />
          <ReadonlyField label="E-post" value={user.email} />
          <RoleSelect
            name="role"
            defaultValue={user.role}
            disabled={user.id === currentUserId}
          />
          <StoreSelect
            stores={stores}
            defaultValue={user.storeId ?? stores[0]?.id ?? ""}
          />
          <ReadonlyField label="Skapad" value={formatDate(user.createdAt)} />
          <ReadonlyField label="Butik nu" value={user.store?.name ?? "-"} />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="min-h-11 cursor-pointer rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {isSaving ? "Sparar..." : "Spara ändringar"}
        </button>
      </div>
    </form>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-0.5 truncate text-lg font-semibold text-zinc-900">
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        className="min-h-11 rounded-lg border border-zinc-200 bg-white px-3 text-base font-normal text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
      />
    </label>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
      {label}
      <p className="flex min-h-11 items-center truncate rounded-lg bg-zinc-50 px-3 text-base font-normal text-zinc-600">
        {value}
      </p>
    </div>
  );
}

function RoleSelect({
  name,
  defaultValue,
  disabled = false,
}: {
  name: string;
  defaultValue: Role;
  disabled?: boolean;
}) {
  return (
    <>
      {disabled ? <input type="hidden" name={name} value={defaultValue} /> : null}
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
        Roll
        <select
          name={disabled ? undefined : name}
          defaultValue={defaultValue}
          disabled={disabled}
          className="min-h-11 cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 text-base font-normal text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 disabled:cursor-not-allowed disabled:bg-zinc-100"
        >
          <option value="PERSONAL">Personal</option>
          <option value="ADMIN">Admin</option>
        </select>
      </label>
    </>
  );
}

function StoreSelect({
  stores,
  defaultValue,
}: {
  stores: StoreOption[];
  defaultValue: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
      Butik
      <select
        name="storeId"
        defaultValue={defaultValue}
        className="min-h-11 cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 text-base font-normal text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
      >
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
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
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return <p className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>{message}</p>;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
