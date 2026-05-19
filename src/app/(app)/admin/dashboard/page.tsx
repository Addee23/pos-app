import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/kassa");
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-zinc-900">Dashboard</h2>
      <p className="mt-2 text-sm text-zinc-500">
        Sync-status, senaste aktiviteter och fel visas här senare.
      </p>
    </section>
  );
}
