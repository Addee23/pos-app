import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/kassa");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [
    productCount,
    lowStockCount,
    pickupCount,
    openPickupCount,
    todaySales,
    recentSales,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { stockQuantity: { lte: 5 } } }),
    prisma.pickup.count(),
    prisma.pickup.count({ where: { status: "READY" } }),
    prisma.sale.findMany({
      where: { createdAt: { gte: today } },
      select: { total: true },
    }),
    prisma.sale.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { id: true, total: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.auditLog.findMany({
      select: { id: true, field: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const todayRevenue = todaySales.reduce(
    (sum, sale) => sum + Number(sale.total),
    0,
  );
  const chartDays = buildSalesChart(recentSales);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-zinc-400">Välkommen tillbaka</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
            Dashboard
          </h2>
        </div>
        <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-bold text-zinc-600 shadow-sm">
          Idag
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          tone="amber"
          icon="▦"
          label="Produkter"
          value={String(productCount)}
          detail={`${lowStockCount} lågt lager`}
        />
        <StatCard
          tone="emerald"
          icon="✓"
          label="Försäljning"
          value={`${formatPrice(todayRevenue)} kr`}
          detail={`${todaySales.length} köp idag`}
        />
        <StatCard
          tone="blue"
          icon="↧"
          label="Upphämtning"
          value={String(openPickupCount)}
          detail={`${pickupCount} totalt`}
        />
        <StatCard
          tone="violet"
          icon="≣"
          label="Aktivitet"
          value={String(recentAuditLogs.length)}
          detail="senaste loggar"
        />
      </div>

      <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-950">Försäljning</h3>
            <p className="mt-1 text-xs text-zinc-500">Senaste 7 dagarna</p>
          </div>
          <Link
            href="/admin/reports"
            className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
          >
            Rapport
          </Link>
        </div>
        <div className="mt-5 flex h-28 items-end gap-2">
          {chartDays.map((day) => (
            <div key={day.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-20 w-full items-end rounded-full bg-zinc-50 px-1">
                <div
                  className="w-full rounded-full bg-blue-400"
                  style={{ height: `${Math.max(day.percent, 8)}%` }}
                />
              </div>
              <span className="text-[10px] font-semibold text-zinc-400">
                {day.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-950">Senaste köp</h3>
            <Link href="/admin/sales" className="text-xs font-bold text-blue-700">
              Visa
            </Link>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {recentSales.slice(0, 3).map((sale) => (
              <MiniRow
                key={sale.id}
                title={`${formatPrice(Number(sale.total))} kr`}
                text={formatTime(sale.createdAt)}
              />
            ))}
            {recentSales.length === 0 ? (
              <p className="text-xs text-zinc-500">Inga köp ännu.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-950">Sync status</h3>
            <Link href="/admin/logs" className="text-xs font-bold text-blue-700">
              Logs
            </Link>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <MiniRow title="Produkter" text="Lokal data" status="OK" />
            <MiniRow title="WooCommerce" text="Väntar på API" status="Senare" />
            <MiniRow title="Audit logs" text="Aktivt" status="OK" />
          </div>
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-950">Snabbåtkomst</h3>
          <span className="text-xs font-semibold text-zinc-400">Admin</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <DashboardAction href="/kassa" icon="□" title="Kassa" />
          <DashboardAction href="/admin/products" icon="▦" title="Produkter" />
          <DashboardAction href="/sok" icon="⌕" title="Sök" />
          <DashboardAction href="/upphamtning" icon="↧" title="Hämta" />
          <DashboardAction href="/admin/users" icon="◎" title="Användare" />
          <DashboardAction href="/admin/settings" icon="⚙" title="Settings" />
        </div>
      </section>
    </section>
  );
}

function StatCard({
  tone,
  icon,
  label,
  value,
  detail,
}: {
  tone: "amber" | "emerald" | "blue" | "violet";
  icon: string;
  label: string;
  value: string;
  detail: string;
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
  };

  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className={`flex size-9 items-center justify-center rounded-2xl ${tones[tone]}`}>
        <span className="text-base font-bold">{icon}</span>
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-bold text-zinc-950">{value}</p>
      <p className="mt-1 truncate text-xs text-zinc-500">{detail}</p>
    </article>
  );
}

function DashboardAction({
  href,
  icon,
  title,
}: {
  href: string;
  icon: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-3xl border border-zinc-200 bg-white px-2 text-center shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
    >
      <span className="flex size-9 items-center justify-center rounded-2xl bg-blue-50 text-lg font-bold text-blue-700">
        {icon}
      </span>
      <span className="text-[11px] font-bold text-zinc-700">{title}</span>
    </Link>
  );
}

function MiniRow({
  title,
  text,
  status,
}: {
  title: string;
  text: string;
  status?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-zinc-50 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-bold text-zinc-800">{title}</p>
        {status ? (
          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-blue-700">
            {status}
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 truncate text-[11px] text-zinc-500">{text}</p>
    </div>
  );
}

function buildSalesChart(sales: { total: unknown; createdAt: Date }[]) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return {
      date,
      label: new Intl.DateTimeFormat("sv-SE", { weekday: "short" }).format(date),
      total: 0,
      percent: 0,
    };
  });

  for (const sale of sales) {
    const saleDate = new Date(sale.createdAt);
    saleDate.setHours(0, 0, 0, 0);
    const day = days.find((item) => item.date.getTime() === saleDate.getTime());
    if (day) {
      day.total += Number(sale.total);
    }
  }

  const max = Math.max(...days.map((day) => day.total), 1);
  return days.map((day) => ({
    ...day,
    percent: (day.total / max) * 100,
  }));
}

function formatPrice(value: number): string {
  return value.toFixed(0);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
