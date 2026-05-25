import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PickupClient } from "@/components/pickups/PickupClient";

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

  // Server-komponenten laddar första listan direkt.
  // Client-komponenten tar sedan över sökning och "markera hämtad".
  const pickups = await prisma.pickup.findMany({
    where: { storeId: session.user.storeId },
    include: {
      pickedUpBy: { select: { name: true, email: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 30,
  });

  return (
    <PickupClient
      initialPickups={pickups.map((pickup) => ({
        ...pickup,
        pickedUpAt: pickup.pickedUpAt?.toISOString() ?? null,
        createdAt: pickup.createdAt.toISOString(),
      }))}
    />
  );
}
