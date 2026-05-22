import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Sale, SaleItem, User } from "@/generated/prisma/client";

type SaleWithRelations = Sale & {
  user: Pick<User, "name" | "email"> | null;
  items: SaleItem[];
};

export default async function AdminSalesPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/kassa");
  }

  const sales = await prisma.sale.findMany({
    include: {
      user: { select: { name: true, email: true } },
      items: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const totalItems = sales.reduce(
    (sum, sale) =>
      sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  );

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Admin
        </p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-900">
          Försäljningar
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Senaste lokala POS-köpen. WooCommerce-sync och rapportfilter byggs
          senare.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <SummaryBox label="Köp" value={String(sales.length)} />
          <SummaryBox label="Varor" value={String(totalItems)} />
          <SummaryBox label="Total" value={`${formatPrice(totalRevenue)} kr`} />
        </div>
      </div>

      <SalesList sales={sales} />
    </section>
  );
}

function SalesList({ sales }: { sales: SaleWithRelations[] }) {
  if (sales.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
        Inga försäljningar har registrerats ännu.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {sales.map((sale) => (
        <SaleCard key={sale.id} sale={sale} />
      ))}
    </div>
  );
}

function SaleCard({ sale }: { sale: SaleWithRelations }) {
  const itemCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-zinc-900">
            {formatPrice(Number(sale.total))} kr
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {sale.user?.name ?? "Okänd användare"} · {formatDate(sale.createdAt)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
          {itemCount} st
        </span>
      </div>

      <ul className="mt-4 flex flex-col divide-y divide-zinc-100">
        {sale.items.map((item) => (
          <li key={item.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {item.productName}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {item.variantName ?? item.ean ?? "Enkel produkt"}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-zinc-900">
                {formatPrice(Number(item.lineTotal))} kr
              </p>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {item.quantity} x {formatPrice(Number(item.unitPrice))} kr
            </p>
          </li>
        ))}
      </ul>
    </article>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-zinc-50 px-3 py-2">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-0.5 truncate text-lg font-semibold text-zinc-900">
        {value}
      </p>
    </div>
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
