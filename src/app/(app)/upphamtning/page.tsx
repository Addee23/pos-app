import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PickupClient } from "@/components/pickups/PickupClient";
import { loadPickupDashboard } from "@/lib/pickup-dashboard-data";

export default async function UpphämtningPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [initialDashboard, stores] = await Promise.all([
    loadPickupDashboard(null),
    prisma.store.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <PickupClient
      initialDashboard={initialDashboard}
      currentRole={session.user.role}
      stores={stores}
    />
  );
}
