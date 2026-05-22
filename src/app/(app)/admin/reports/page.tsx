import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminDashboardLink } from "@/components/layout/AdminDashboardLink";

type TopProduct = {
  key: string;
  name: string;
  variantName: string | null;
  quantity: number;
  revenue: number;
};

export default async function AdminReportsPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/kassa");
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [allSales, todaySales, saleItems, recentSales] = await Promise.all([
    prisma.sale.findMany({
      select: { id: true, total: true },
    }),
    prisma.sale.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { id: true, total: true },
    }),
    prisma.saleItem.findMany({
      select: {
        productId: true,
        variantId: true,
        productName: true,
        variantName: true,
        quantity: true,
        lineTotal: true,
      },
    }),
    prisma.sale.findMany({
      include: {
        user: { select: { name: true, email: true } },
        items: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const totalRevenue = allSales.reduce(
    (sum, sale) => sum + Number(sale.total),
    0,
  );
  const todayRevenue = todaySales.reduce(
    (sum, sale) => sum + Number(sale.total),
    0,
  );
  const totalItems = saleItems.reduce((sum, item) => sum + item.quantity, 0);
  const averageSale =
    allSales.length > 0 ? totalRevenue / allSales.length : 0;
  const topProducts = getTopProducts(saleItems);

  return (
    <section className="flex flex-col gap-4">
      <AdminDashboardLink />

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Admin
        </p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-900">Rapporter</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Översikt över lokala POS-köp. WooCommerce-data kopplas in senare när
          integrationen finns.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <MetricCard label="Idag" value={`${formatPrice(todayRevenue)} kr`} />
        <MetricCard label="Total försäljning" value={`${formatPrice(totalRevenue)} kr`} />
        <MetricCard label="Köp" value={String(allSales.length)} />
        <MetricCard label="Snittköp" value={`${formatPrice(averageSale)} kr`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
        <TopProductsList products={topProducts} totalItems={totalItems} />
        <RecentSalesList sales={recentSales} />
      </div>
    </section>
  );
}

function getTopProducts(
  saleItems: Array<{
    productId: string | null;
    variantId: string | null;
    productName: string;
    variantName: string | null;
    quantity: number;
    lineTotal: unknown;
  }>,
): TopProduct[] {
  const products = new Map<string, TopProduct>();

  for (const item of saleItems) {
    const key = item.variantId ?? item.productId ?? item.productName;
    const existing = products.get(key);

    if (existing) {
      existing.quantity += item.quantity;
      existing.revenue += Number(item.lineTotal);
      continue;
    }

    products.set(key, {
      key,
      name: item.productName,
      variantName: item.variantName,
      quantity: item.quantity,
      revenue: Number(item.lineTotal),
    });
  }

  return [...products.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-zinc-900">
        {value}
      </p>
    </div>
  );
}

function TopProductsList({
  products,
  totalItems,
}: {
  products: TopProduct[];
  totalItems: number;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            Mest sålda produkter
          </h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Räknat på alla lokala POS-köp.
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
          {totalItems} st
        </span>
      </div>

      {products.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
          Inga sålda produkter finns ännu.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-zinc-100">
          {products.map((product, index) => (
            <li key={product.key} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">
                    {index + 1}. {product.name}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {product.variantName ?? "Enkel produkt"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-zinc-900">
                    {product.quantity} st
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {formatPrice(product.revenue)} kr
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentSalesList({
  sales,
}: {
  sales: Array<{
    id: string;
    total: unknown;
    createdAt: Date;
    user: { name: string; email: string } | null;
    items: Array<{ id: string; quantity: number }>;
  }>;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Senaste köp</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            De fem senaste POS-försäljningarna.
          </p>
        </div>
        <Link
          href="/admin/sales"
          className="shrink-0 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
        >
          Visa alla
        </Link>
      </div>

      {sales.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
          Inga försäljningar har registrerats ännu.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-zinc-100">
          {sales.map((sale) => {
            const itemCount = sale.items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            );

            return (
              <li key={sale.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">
                      {formatPrice(Number(sale.total))} kr
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {sale.user?.name ?? "Okänd användare"} ·{" "}
                      {formatDate(sale.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                    {itemCount} st
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function formatPrice(value: number): string {
  return value.toFixed(2);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
