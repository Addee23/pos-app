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
      />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-24 pt-4">
        {children}
      </main>
      <BottomNav role={session.user.role} />
    </div>
  );
}
