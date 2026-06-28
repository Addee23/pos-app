import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  KassaClient,
  type PosStore,
} from "@/components/pos/KassaClient";

const STORE_SELECT = {
  id: true,
  name: true,
  logoUrl: true,
  address: true,
  receiptFooter: true,
  returnText: true,
  thankYouMessage: true,
  socialLinks: true,
  receiptWidthMm: true,
} as const;

type KassaPageProps = {
  searchParams: Promise<{ storeId?: string }>;
};

export default async function KassaPage({ searchParams }: KassaPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  if (isAdmin) {
    const { storeId: paramStoreId } = await searchParams;

    const allStores = await prisma.store.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    if (allStores.length === 0) {
      return (
        <section className="rounded-lg border border-dashed border-zinc-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-zinc-900">Kassa</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Ingen butik är skapad ännu. Skapa en butik under Inställningar.
          </p>
        </section>
      );
    }

    const resolvedStoreId = paramStoreId ?? allStores[0].id;
    const store = await prisma.store.findUnique({
      where: { id: resolvedStoreId },
      select: STORE_SELECT,
    });

    if (!store) redirect("/kassa");

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
        isAdmin={true}
        allStores={allStores}
      />
    );
  }

  // Personal: hämta butik direkt från DB, inte session
  const freshUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { storeId: true },
  });

  if (!freshUser?.storeId) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Kassa</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Du är inte tilldelad en butik. Kontakta en administratör.
        </p>
      </section>
    );
  }

  const store = await prisma.store.findUnique({
    where: { id: freshUser.storeId },
    select: STORE_SELECT,
  });

  if (!store) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Kassa</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Butiken hittades inte. Kontakta en administratör.
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
      isAdmin={false}
    />
  );
}
