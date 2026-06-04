import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { DashboardSalesSection } from "@/components/dashboard/DashboardSalesSection";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import {
  addDays,
  buildSalesChartData,
  formatDateParam,
  formatPeriodLabel,
  resolveSalesRange,
  startOfDay,
  sumSaleTotals,
} from "@/lib/dashboard-sales-chart";
import { PickupStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <PageLoadingSkeleton title="Laddar dashboard…" variant="dashboard" />
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/kassa");
  }

  const today = startOfDay(new Date());
  const yesterday = startOfDay(new Date());
  yesterday.setDate(yesterday.getDate() - 1);
  const defaultRange = resolveSalesRange(null, null);

  const [
    productCount,
    lowStockCount,
    openPickupCount,
    todaySales,
    yesterdaySales,
    chartSales,
    recentSales,
    storeName,
    userCount,
    adminCount,
    personalCount,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { stockQuantity: { lte: 5 } } }),
    prisma.pickup.count({
      where: {
        status: { in: [PickupStatus.AWAITING_PACK, PickupStatus.READY] },
      },
    }),
    prisma.sale.findMany({
      where: { createdAt: { gte: today } },
      select: { total: true },
    }),
    prisma.sale.findMany({
      where: { createdAt: { gte: yesterday, lt: today } },
      select: { total: true },
    }),
    prisma.sale.findMany({
      where: {
        createdAt: {
          gte: defaultRange.from,
          lt: addDays(defaultRange.to, 1),
        },
      },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.sale.findMany({
      select: { id: true, total: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    session.user.storeId
      ? prisma.store
          .findUnique({
            where: { id: session.user.storeId },
            select: { name: true },
          })
          .then((store) => store?.name ?? null)
      : prisma.store
          .findFirst({ orderBy: { name: "asc" }, select: { name: true } })
          .then((store) => store?.name ?? null),
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { role: "PERSONAL" } }),
  ]);

  const todayRevenue = sumTotals(todaySales);
  const yesterdayRevenue = sumTotals(yesterdaySales);
  const avgReceipt =
    todaySales.length > 0 ? todayRevenue / todaySales.length : 0;
  const yesterdayAvg =
    yesterdaySales.length > 0
      ? yesterdayRevenue / yesterdaySales.length
      : 0;

  const chartDays = buildSalesChartData(
    chartSales,
    defaultRange.from,
    defaultRange.to,
  );

  return (
    <section className="flex flex-col gap-4 pb-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-950">
            Dashboard
          </h2>
          {storeName ? (
            <p className="mt-0.5 text-sm text-zinc-500">{storeName}</p>
          ) : null}
        </div>
        <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
          Idag
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon="🛒"
          iconTone="orange"
          label="Försäljning idag"
          value={`${formatPrice(todayRevenue)} kr`}
          trend={percentChange(todayRevenue, yesterdayRevenue)}
          trendLabel="jämfört med igår"
        />
        <KpiCard
          icon="📋"
          iconTone="blue"
          label="Antal köp"
          value={String(todaySales.length)}
          trend={percentChange(todaySales.length, yesterdaySales.length)}
          trendLabel="jämfört med igår"
        />
        <KpiCard
          icon="🧾"
          iconTone="violet"
          label="Snitt per kvitto"
          value={`${formatPrice(avgReceipt)} kr`}
          trend={percentChange(avgReceipt, yesterdayAvg)}
          trendLabel="jämfört med igår"
        />
        <KpiCard
          icon="📦"
          iconTone="emerald"
          label="Redo att hämta"
          value={String(openPickupCount)}
          detail={
            lowStockCount > 0
              ? `${lowStockCount} produkter med lågt lager`
              : `${productCount} produkter i katalogen`
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
      <DashboardSalesSection
        initialFrom={formatDateParam(defaultRange.from)}
        initialTo={formatDateParam(defaultRange.to)}
        initialPeriodLabel={formatPeriodLabel(
          defaultRange.from,
          defaultRange.to,
        )}
        initialTotalRevenue={sumSaleTotals(chartSales)}
        initialSaleCount={chartSales.length}
        initialPoints={chartDays}
      />

      <section className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-950">
            Senaste transaktioner
          </h3>
          <Link
            href="/admin/sales"
            className="text-xs font-bold text-blue-600"
          >
            Visa alla
          </Link>
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {recentSales.length > 0 ? (
            recentSales.map((sale) => (
              <li
                key={sale.id}
                className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-3 py-2.5"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm">
                  ✓
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-zinc-800">
                    {formatSaleRef(sale.id)}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {formatTime(sale.createdAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-bold text-zinc-900">
                    {formatPrice(Number(sale.total))} kr
                  </p>
                  <p className="text-[10px] font-semibold text-emerald-600">
                    Slutförd
                  </p>
                </div>
              </li>
            ))
          ) : (
            <li className="rounded-2xl bg-zinc-50 px-3 py-6 text-center text-xs text-zinc-500">
              Inga köp registrerade ännu.
            </li>
          )}
        </ul>
      </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-950">Sync-status</h3>
          <Link href="/admin/logs" className="text-xs font-bold text-blue-600">
            Loggar
          </Link>
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          <SyncRow label="Produkter" detail="Lokal katalog" status="ok" />
          <SyncRow
            label="WooCommerce"
            detail="Webhook & API"
            status="pending"
          />
          <SyncRow label="Audit logs" detail="Produktändringar" status="ok" />
        </ul>
      </section>

      <section className="overflow-hidden rounded-3xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-xl">
            👥
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-zinc-950">
              Team & behörigheter
            </h3>
            <p className="mt-0.5 text-xs leading-5 text-zinc-500">
              Skapa personal och admin, tilldela butik och roller.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <UserStatPill label="Totalt" value={userCount} />
              <UserStatPill label="Personal" value={personalCount} />
              <UserStatPill label="Admin" value={adminCount} />
            </div>
          </div>
        </div>
        <Link
          href="/admin/users"
          className="mt-4 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-bold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700"
        >
          Hantera användare
          <span aria-hidden>→</span>
        </Link>
      </section>
      </div>

      <section>
        <h3 className="mb-3 text-sm font-bold text-zinc-950">
          Snabbfunktioner
        </h3>
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
          <QuickAction href="/kassa" icon="🛒" label="Kassa" />
          <QuickAction href="/sok" icon="🔍" label="Sök produkt" />
          <QuickAction href="/admin/products" icon="📦" label="Produkter" />
        </div>
      </section>
    </section>
  );
}

function KpiCard({
  icon,
  iconTone,
  label,
  value,
  trend,
  trendLabel,
  detail,
}: {
  icon: string;
  iconTone: "orange" | "blue" | "violet" | "emerald";
  label: string;
  value: string;
  trend?: number | null;
  trendLabel?: string;
  detail?: string;
}) {
  const tones = {
    orange: "bg-orange-50 text-orange-600",
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <article className="rounded-3xl border border-zinc-200/80 bg-white p-3.5 shadow-sm">
      <div
        className={`flex size-9 items-center justify-center rounded-2xl text-base ${tones[iconTone]}`}
      >
        {icon}
      </div>
      <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p className="mt-0.5 truncate text-lg font-bold text-zinc-950">
        {value}
      </p>
      {trend != null && trendLabel ? (
        <p
          className={`mt-1 text-[11px] font-semibold ${
            trend >= 0 ? "text-emerald-600" : "text-red-500"
          }`}
        >
          {formatTrend(trend)} {trendLabel}
        </p>
      ) : detail ? (
        <p className="mt-1 truncate text-[11px] text-zinc-500">{detail}</p>
      ) : null}
    </article>
  );
}

function SyncRow({
  label,
  detail,
  status,
}: {
  label: string;
  detail: string;
  status: "ok" | "pending" | "error";
}) {
  const badges = {
    ok: { text: "OK", className: "bg-emerald-50 text-emerald-700" },
    pending: { text: "Senare", className: "bg-amber-50 text-amber-700" },
    error: { text: "Fel", className: "bg-red-50 text-red-700" },
  };
  const badge = badges[status];

  return (
    <li className="flex items-center justify-between gap-2 rounded-2xl bg-zinc-50 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-zinc-800">{label}</p>
        <p className="truncate text-[11px] text-zinc-500">{detail}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.className}`}
      >
        {badge.text}
      </span>
    </li>
  );
}

function UserStatPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700">
      <span className="text-violet-600">{value}</span>
      {label}
    </span>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl border border-zinc-200/80 bg-white px-1 py-3 text-center shadow-sm transition hover:border-blue-200 hover:bg-blue-50/50"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[11px] font-bold leading-tight text-zinc-700">
        {label}
      </span>
    </Link>
  );
}

function buildSalesChart(sales: { total: unknown; createdAt: Date }[]) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = startOfDay(new Date());
    date.setDate(date.getDate() - (6 - index));
    return {
      date,
      label: new Intl.DateTimeFormat("sv-SE", { weekday: "short" }).format(
        date,
      ),
      total: 0,
      percent: 0,
    };
  });

  for (const sale of sales) {
    const saleDate = startOfDay(new Date(sale.createdAt));
    const day = days.find((item) => item.date.getTime() === saleDate.getTime());
    if (day) {
      day.total += Number(sale.total);
    }
  }

  const max = Math.max(...days.map((day) => day.total), 1);
  return days.map((day) => ({
    label: day.label,
    total: day.total,
    percent: (day.total / max) * 100,
  }));
}

function sumTotals(sales: { total: unknown }[]): number {
  return sales.reduce((sum, sale) => sum + Number(sale.total), 0);
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current > 0 ? 100 : null;
  }
  return ((current - previous) / previous) * 100;
}

function formatTrend(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatSaleRef(id: string): string {
  return `#KO-${id.slice(-5).toUpperCase()}`;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
