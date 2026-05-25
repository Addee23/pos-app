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
          Startpunkt för admin. Härifrån når du produkter, försäljning,
          upphämtningar, användare, rapporter och settings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-900">
            Vanliga adminuppgifter
          </h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Välj vad du vill göra. WooCommerce-sync och API-fel visas här senare
            när integrationen finns.
          </p>
        </div>
        <DashboardLink
          href="/admin/products"
          title="Produkter"
          text="Sök produkter och uppdatera pris, EAN, lager och lagerplats."
        />
        <DashboardLink
          href="/admin/sales"
          title="Försäljningar"
          text="Se senaste lokala POS-köp och rader."
        />
        <DashboardLink
          href="/admin/logs"
          title="Logs"
          text="Se audit logs för produkt- och variantändringar."
        />
        <DashboardLink
          href="/admin/users"
          title="Användare"
          text="Hantera personal, admins, roller och butikskoppling."
        />
        <DashboardLink
          href="/admin/reports"
          title="Rapporter"
          text="Se försäljning, snittköp och mest sålda produkter."
        />
        <DashboardLink
          href="/admin/settings"
          title="Settings"
          text="Hantera butiksuppgifter, kvittotexter och WooCommerce URL."
        />
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
