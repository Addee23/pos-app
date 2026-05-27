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

  const adminCount = users.filter((user) => user.role === "ADMIN").length;
  const personalCount = users.filter((user) => user.role === "PERSONAL").length;

  return (
    <section className="flex flex-col gap-4">
      <AdminDashboardLink />

      <div className="overflow-hidden rounded-3xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-xl">
            👥
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
              Admin
            </p>
            <h2 className="mt-0.5 text-xl font-bold text-zinc-950">
              Användare
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-zinc-500">
              Skapa konton för personal och admin. Tilldela butik och roll —
              lösenord hashas automatiskt vid skapande.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatPill label="Totalt" value={users.length} />
              <StatPill label="Personal" value={personalCount} />
              <StatPill label="Admin" value={adminCount} />
            </div>
          </div>
        </div>
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

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700">
      <span className="text-violet-600">{value}</span>
      {label}
    </span>
  );
}
