import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminDashboardLink } from "@/components/layout/AdminDashboardLink";
import { StoreSettingsForm } from "@/components/settings/StoreSettingsForm";

type SettingsPageProps = {
  searchParams: Promise<{ storeId?: string }>;
};

export default async function AdminSettingsPage({
  searchParams,
}: SettingsPageProps) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/kassa");
  }

  const { storeId } = await searchParams;
  const stores = await prisma.store.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  if (stores.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Settings</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Ingen butik finns ännu. Skapa en butik innan settings kan sparas.
        </p>
      </section>
    );
  }

  const selectedStoreId = storeId ?? stores[0].id;
  const store = await prisma.store.findUnique({
    where: { id: selectedStoreId },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      wooUrl: true,
      address: true,
      receiptFooter: true,
      returnText: true,
      thankYouMessage: true,
      socialLinks: true,
      receiptWidthMm: true,
    },
  });

  if (!store) {
    redirect("/admin/settings");
  }

  return (
    <section className="flex flex-col gap-4">
      <AdminDashboardLink />
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Admin
        </p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-900">Settings</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Hantera butikens uppgifter, kvittotexter och WooCommerce URL utan att
          använda testdata.
        </p>
      </div>

      <StoreSettingsForm stores={stores} store={store} />
    </section>
  );
}
