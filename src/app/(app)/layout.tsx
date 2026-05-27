import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";

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
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,#e0e7ff_0,#f8fafc_30rem,#f6f7f9_62rem)]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-[#f7f8fb] shadow-2xl shadow-zinc-300/60">
        <AppHeader
          title="POS & Lager"
          userName={session.user.name}
          role={session.user.role}
        />
        <main className="w-full flex-1 px-4 pb-28 pt-4">{children}</main>
        <BottomNav role={session.user.role} />
      </div>
    </div>
  );
}
