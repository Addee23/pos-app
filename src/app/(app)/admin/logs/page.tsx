import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminDashboardLink } from "@/components/layout/AdminDashboardLink";
import type { AuditLog, Store, User } from "@/generated/prisma/client";

type AuditLogWithRelations = AuditLog & {
  user: Pick<User, "name" | "email">;
  store: Pick<Store, "name"> | null;
};

export default async function AdminLogsPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/kassa");
  }

  // Hämtar de senaste audit-loggarna från databasen.
  // Just nu loggar vi produkt- och variantändringar lokalt.
  // Sync-loggar från WooCommerce kommer senare när integrationen finns.
  const logs = await prisma.auditLog.findMany({
    include: {
      user: { select: { name: true, email: true } },
      store: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const productLogCount = logs.filter(
    (log) => log.entityType === "Product",
  ).length;
  const variantLogCount = logs.filter(
    (log) => log.entityType === "ProductVariant",
  ).length;

  return (
    <section className="flex flex-col gap-4">
      <AdminDashboardLink />

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Admin
        </p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-900">Logs</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Audit logs visar vem som har ändrat produkter eller varianter, vad som
          ändrades och när det hände.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <SummaryBox label="Totalt" value={String(logs.length)} />
          <SummaryBox label="Produkter" value={String(productLogCount)} />
          <SummaryBox label="Varianter" value={String(variantLogCount)} />
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Sync logs</h3>
        <p className="mt-1 text-sm leading-6 text-zinc-500">
          WooCommerce-webhooks, API-fel och retries visas här när integrationen
          är byggd.
        </p>
      </div>

      <AuditLogList logs={logs} />
    </section>
  );
}

function AuditLogList({ logs }: { logs: AuditLogWithRelations[] }) {
  if (logs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
        Inga audit logs har skapats ännu.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {logs.map((log) => (
        <AuditLogCard key={log.id} log={log} />
      ))}
    </div>
  );
}

function AuditLogCard({ log }: { log: AuditLogWithRelations }) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-zinc-900">
            {fieldLabel(log.field)}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {entityLabel(log.entityType)} ändrad av {log.user.name}
          </p>
        </div>
        <time className="shrink-0 text-right text-xs text-zinc-400">
          {formatDate(log.createdAt)}
        </time>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <ValueBox label="Från" value={log.oldValue} />
        <ValueBox label="Till" value={log.newValue} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-500 sm:grid-cols-3">
        <MetaBox label="Butik" value={log.store?.name ?? "-"} />
        <MetaBox label="Användare" value={log.user.email} />
        <MetaBox label="Objekt-id" value={log.entityId} />
      </div>
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

function ValueBox({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2">
      <p className="font-medium text-zinc-400">{label}</p>
      <p className="mt-0.5 break-words text-zinc-800">{value || "-"}</p>
    </div>
  );
}

function MetaBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-zinc-50 px-3 py-2">
      <p className="font-medium text-zinc-400">{label}</p>
      <p className="mt-0.5 truncate text-zinc-700">{value}</p>
    </div>
  );
}

function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    price: "Pris",
    ean: "EAN",
    stockQuantity: "Lagersaldo",
    stockLocation: "Lagerplats",
  };

  return labels[field] ?? field;
}

function entityLabel(entityType: string): string {
  const labels: Record<string, string> = {
    Product: "Produkt",
    ProductVariant: "Variant",
  };

  return labels[entityType] ?? entityType;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
