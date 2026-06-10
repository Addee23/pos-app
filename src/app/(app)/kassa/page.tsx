import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  KassaClient,
  type PosStore,
} from "@/components/pos/KassaClient";

export default async function KassaPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.storeId) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Kassa</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Användaren saknar butik och kan därför inte använda kassan.
        </p>
      </section>
    );
  }

  const store = await prisma.store.findUnique({
    where: { id: session.user.storeId },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      address: true,
      receiptFooter: true,
      returnText: true,
      thankYouMessage: true,
      socialLinks: true,
      receiptWidthMm: true,
    },
  });

  if (!store) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Kassa</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Butiken hittades inte och kassan kan därför inte öppnas.
        </p>
      </section>
    );
  }

  const serializedStore: PosStore = {
    id: store.id,
    name: store.name,
    logoUrl: store.logoUrl,
    address: store.address,
    receiptFooter: store.receiptFooter,
    returnText: store.returnText,
    thankYouMessage: store.thankYouMessage,
    socialLinks: store.socialLinks,
    receiptWidthMm: store.receiptWidthMm,
  };

  return (
    <KassaClient
      store={serializedStore}
      isAdmin={session.user.role === "ADMIN"}
    />
  );
}
