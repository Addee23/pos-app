import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminDashboardLink } from "@/components/layout/AdminDashboardLink";
import { UserManagementClient } from "@/components/users/UserManagementClient";

export default async function AdminUsersPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/kassa");
  }

  const [users, stores] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        storeId: true,
        createdAt: true,
        store: { select: { id: true, name: true } },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.store.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <section className="flex flex-col gap-4">
      <AdminDashboardLink />

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Admin
        </p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-900">
          Användare
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Skapa personal/admin och ändra roll eller butik för befintliga
          användare.
        </p>
      </div>

      <UserManagementClient
        initialUsers={users.map((user) => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
        }))}
        stores={stores}
        currentUserId={session.user.id}
      />
    </section>
  );
}
