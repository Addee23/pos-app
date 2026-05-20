export default function KassaPage() {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        POS
      </p>
      <h2 className="mt-1 text-xl font-semibold text-zinc-900">Kassa</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        Kassaflödet byggs i nästa steg. Här kommer produktval, kundvagn,
        totalsumma och lokalt lagersaldo.
      </p>
    </section>
  );
}
