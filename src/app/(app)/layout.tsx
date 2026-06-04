import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppNav } from "@/components/layout/AppNav";
import { BottomNav } from "@/components/layout/BottomNav";
import { NavPendingProvider } from "@/components/layout/NavigationProgress";
import { AsyncPendingProvider } from "@/components/ui/AsyncPendingProvider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <NavPendingProvider>
      <AsyncPendingProvider>
      <div className="min-h-full bg-[radial-gradient(circle_at_top_left,#e0e7ff_0,#f8fafc_30rem,#f6f7f9_62rem)] lg:bg-[#eef1f6]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-[#f7f8fb] shadow-2xl shadow-zinc-300/60 lg:mx-0 lg:max-w-none lg:flex-row lg:shadow-none">
        <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-zinc-200/80 lg:bg-white">
          <div className="border-b border-zinc-200/80 px-6 py-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-xs font-bold text-accent-foreground shadow-sm shadow-blue-200">
              POS
            </div>
            <p className="mt-3 text-sm font-bold text-zinc-950">POS & Lager</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {session.user.role === "ADMIN" ? "Administration" : "Butikspersonal"}
            </p>
          </div>
          <AppNav role={session.user.role} variant="desktop" />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader
            title="POS & Lager"
            userName={session.user.name}
            role={session.user.role}
          />
          <main className="app-main relative w-full flex-1 px-4 pb-28 pt-4 lg:px-8 lg:pb-8 lg:pt-6">
            <div className="w-full">{children}</div>
          </main>
          <BottomNav role={session.user.role} />
        </div>
      </div>
    </div>
      </AsyncPendingProvider>
    </NavPendingProvider>
  );
}
