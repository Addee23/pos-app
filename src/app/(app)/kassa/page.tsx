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

  return (
    <KassaClient
      store={serializeStore(store)}
      isAdmin={session.user.role === "ADMIN"}
      allStores={allStores}
    />
  );
}

function serializeStore(
  store: {
    id: string;
    name: string;
    logoUrl: string | null;
    address: string | null;
    receiptFooter: string | null;
    returnText: string | null;
    thankYouMessage: string | null;
    socialLinks: string | null;
    receiptWidthMm: number;
  },
): PosStore {
  return {
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
}
