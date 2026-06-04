import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PickupClient } from "@/components/pickups/PickupClient";
import { loadPickupDashboard } from "@/lib/pickup-dashboard-data";

export default async function UpphämtningPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.storeId) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Användaren saknar butik och kan därför inte se upphämtningar.
      </p>
    );
  }

  const initialDashboard = await loadPickupDashboard(session.user.storeId);

  return (
    <PickupClient
      initialDashboard={initialDashboard}
      currentRole={session.user.role}
    />
  );
}
