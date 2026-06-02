"use client";

import { InputField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/ToastProvider";
import { signOut } from "next-auth/react";
import { useState } from "react";

type ProfileMenuProps = {
  userName?: string | null;
  roleLabel: string;
  role: "ADMIN" | "PERSONAL";
};

export function ProfileMenu({ userName, roleLabel, role }: ProfileMenuProps) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function changePassword(formData: FormData) {
    setSaving(true);

    try {
      const response = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: formData.get("currentPassword"),
          newPassword: formData.get("newPassword"),
          confirmPassword: formData.get("confirmPassword"),
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(data?.error ?? "Kunde inte byta lösenord");
        return;
      }

      toast.success("Lösenordet är uppdaterat.");
    } catch (error) {
      console.error(error);
      toast.error("Något gick fel vid anropet. Försök igen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Öppna profil"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground shadow-sm shadow-blue-200"
      >
        {initials(userName)}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-3xl border border-zinc-200 bg-white p-4 shadow-2xl shadow-zinc-900/15">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-zinc-950">
                {userName ?? "Profil"}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-blue-700">
                {roleLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-500"
              aria-label="Stäng profil"
            >
              x
            </button>
          </div>

          {!passwordFormOpen ? (
            <div className="mt-4 flex flex-col gap-2">
              {role === "PERSONAL" ? (
                <button
                  type="button"
                  onClick={() => setPasswordFormOpen(true)}
                  className="min-h-11 w-full cursor-pointer rounded-2xl bg-blue-50 px-4 text-left text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                >
                  Byt lösenord
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="min-h-11 w-full cursor-pointer rounded-2xl border border-zinc-200 bg-white px-4 text-left text-sm font-bold text-zinc-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                Logga ut
              </button>
            </div>
          ) : (
            <form action={changePassword} className="mt-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setPasswordFormOpen(false)}
                className="w-fit cursor-pointer text-xs font-bold text-zinc-500 hover:text-blue-700"
              >
                Tillbaka
              </button>
              <InputField
                label="Nuvarande lösenord"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                hint="Ditt nuvarande inloggningslösenord."
                labelClassName="text-xs font-bold text-zinc-600"
                inputClassName="min-h-11 rounded-2xl"
              />
              <InputField
                label="Nytt lösenord"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Minst 8 tecken"
                hint="Välj ett starkt lösenord som du inte använder på andra ställen."
                labelClassName="text-xs font-bold text-zinc-600"
                inputClassName="min-h-11 rounded-2xl"
              />
              <InputField
                label="Bekräfta nytt lösenord"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Upprepa nytt lösenord"
                hint="Måste matcha det nya lösenordet ovan."
                labelClassName="text-xs font-bold text-zinc-600"
                inputClassName="min-h-11 rounded-2xl"
              />

              <button
                type="submit"
                disabled={saving}
                className="min-h-11 cursor-pointer rounded-2xl bg-accent px-4 text-sm font-bold text-accent-foreground shadow-sm shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Sparar..." : "Spara nytt lösenord"}
              </button>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}

function initials(name?: string | null): string {
  if (!name) {
    return "P";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
