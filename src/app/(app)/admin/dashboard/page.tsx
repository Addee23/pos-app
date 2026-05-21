import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/kassa");
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Admin
        </p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-900">Dashboard</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Översikt för sync-status, senaste aktiviteter och fel när de
          funktionerna byggs.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <DashboardLink href="/admin/products" title="Produkter" text="Hantera lokal produktdata och lager." />
        <DashboardLink href="/admin/settings" title="Settings" text="Hantera butik och kvittoinställningar." />
      </div>
    </section>
  );
}

function DashboardLink({
  href,
  title,
  text,
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="cursor-pointer rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm"
    >
      <p className="font-semibold text-zinc-900">{title}</p>
      <p className="mt-1 text-sm leading-6 text-zinc-500">{text}</p>
    </Link>
  );
}
