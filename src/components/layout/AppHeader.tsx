import { signOut } from "@/auth";
import type { Role } from "@/generated/prisma/client";
import { AppNav } from "@/components/layout/AppNav";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  userName?: string | null;
  role: Role;
};

export function AppHeader({ title, subtitle, userName, role }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 shadow-sm shadow-zinc-200/40 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 py-3 sm:px-4 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-foreground shadow-sm shadow-blue-200">
              POS
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold text-zinc-950">
                  {title}
                </h1>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  {role === "ADMIN" ? "Admin" : "Personal"}
                </span>
              </div>
              {subtitle ? (
                <p className="truncate text-sm text-zinc-500">{subtitle}</p>
              ) : null}
              {userName ? (
                <p className="truncate text-xs text-zinc-400">
                  Inloggad som {userName}
                </p>
              ) : null}
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="min-h-9 shrink-0 cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              Logga ut
            </button>
          </form>
        </div>
        <AppNav role={role} variant="desktop" />
      </div>
    </header>
  );
}
