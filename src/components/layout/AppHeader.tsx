import { signOut } from "@/auth";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  userName?: string | null;
};

export function AppHeader({ title, subtitle, userName }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-3 py-4 sm:px-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-zinc-900">{title}</h1>
          {subtitle ? (
            <p className="truncate text-sm text-zinc-500">{subtitle}</p>
          ) : null}
          {userName ? (
            <p className="truncate text-xs text-zinc-400">Inloggad som {userName}</p>
          ) : null}
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="shrink-0 cursor-pointer rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Logga ut
          </button>
        </form>
      </div>
    </header>
  );
}
