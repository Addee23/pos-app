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
    <div className="flex min-h-full flex-col bg-zinc-50">
      <AppHeader
        title="POS & Lager"
        userName={session.user.name}
        role={session.user.role}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 pb-36 pt-3 sm:px-4 sm:pt-4 md:px-6 md:pb-8">
        {children}
      </main>
      <BottomNav role={session.user.role} />
    </div>
  );
}
