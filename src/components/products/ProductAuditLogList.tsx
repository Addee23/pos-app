type ProductAuditLog = {
  id: string;
  entityType: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
  user: {
    name: string;
    email: string;
  };
};

type ProductAuditLogListProps = {
  logs: ProductAuditLog[];
};

export function ProductAuditLogList({ logs }: ProductAuditLogListProps) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            Ändringshistorik
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            Senaste sparade ändringar för produkt och varianter.
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
          {logs.length}
        </span>
      </div>

      {logs.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-sm text-zinc-500">
          Inga ändringar har loggats ännu.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-zinc-100">
          {logs.map((log) => (
            <li key={log.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900">
                    {fieldLabel(log.field)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {log.entityType === "ProductVariant" ? "Variant" : "Produkt"}{" "}
                    av {log.user.name}
                  </p>
                </div>
                <time className="shrink-0 text-right text-xs text-zinc-400">
                  {formatDate(log.createdAt)}
                </time>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <ValueBox label="Från" value={log.oldValue} />
                <ValueBox label="Till" value={log.newValue} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
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

function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    price: "Pris",
    ean: "EAN",
    stockQuantity: "Lagersaldo",
    stockLocation: "Lagerplats",
  };

  return labels[field] ?? field;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
