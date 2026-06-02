"use client";

import { useToast } from "@/components/ui/ToastProvider";
import { useCallback, useId, useState } from "react";
import {
  addDays,
  formatDateParam,
  startOfDay,
  type SalesChartPoint,
} from "@/lib/dashboard-sales-chart";

type SalesApiResponse = {
  from: string;
  to: string;
  periodLabel: string;
  totalRevenue: number;
  saleCount: number;
  points: SalesChartPoint[];
  error?: string;
};

type DatePreset = {
  id: string;
  label: string;
  getRange: () => { from: Date; to: Date };
};

const PRESETS: DatePreset[] = [
  {
    id: "7d",
    label: "7 dagar",
    getRange: () => ({
      from: addDays(startOfDay(new Date()), -6),
      to: startOfDay(new Date()),
    }),
  },
  {
    id: "30d",
    label: "30 dagar",
    getRange: () => ({
      from: addDays(startOfDay(new Date()), -29),
      to: startOfDay(new Date()),
    }),
  },
  {
    id: "month",
    label: "Denna månad",
    getRange: () => {
      const today = startOfDay(new Date());
      return {
        from: new Date(today.getFullYear(), today.getMonth(), 1),
        to: today,
      };
    },
  },
  {
    id: "prev-month",
    label: "Förra månaden",
    getRange: () => {
      const today = startOfDay(new Date());
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from, to };
    },
  },
];

type DashboardSalesSectionProps = {
  initialFrom: string;
  initialTo: string;
  initialPeriodLabel: string;
  initialTotalRevenue: number;
  initialSaleCount: number;
  initialPoints: SalesChartPoint[];
};

export function DashboardSalesSection({
  initialFrom,
  initialTo,
  initialPeriodLabel,
  initialTotalRevenue,
  initialSaleCount,
  initialPoints,
}: DashboardSalesSectionProps) {
  const toast = useToast();
  const pickerId = useId();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(initialFrom);
  const [draftTo, setDraftTo] = useState(initialTo);
  const [activePreset, setActivePreset] = useState<string | null>("7d");
  const [loading, setLoading] = useState(false);

  const [periodLabel, setPeriodLabel] = useState(initialPeriodLabel);
  const [totalRevenue, setTotalRevenue] = useState(initialTotalRevenue);
  const [saleCount, setSaleCount] = useState(initialSaleCount);
  const [points, setPoints] = useState(initialPoints);

  const loadRange = useCallback(async (fromDate: string, toDate: string) => {
    setLoading(true);

    try {
      const params = new URLSearchParams({ from: fromDate, to: toDate });
      const response = await fetch(`/api/admin/dashboard/sales?${params}`);
      const data = (await response.json()) as SalesApiResponse;

      if (!response.ok) {
        toast.error(data.error ?? "Kunde inte hämta försäljning");
        return;
      }

      setPeriodLabel(data.periodLabel);
      setTotalRevenue(data.totalRevenue);
      setSaleCount(data.saleCount);
      setPoints(data.points);
      setDraftFrom(data.from);
      setDraftTo(data.to);
    } catch {
      toast.error("Kunde inte hämta försäljning");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  function applyPreset(preset: DatePreset) {
    const range = preset.getRange();
    const fromDate = formatDateParam(range.from);
    const toDate = formatDateParam(range.to);
    setActivePreset(preset.id);
    setDraftFrom(fromDate);
    setDraftTo(toDate);
    setPickerOpen(false);
    void loadRange(fromDate, toDate);
  }

  function applyCustomRange() {
    if (!draftFrom || !draftTo) {
      toast.error("Välj både start- och slutdatum.");
      return;
    }

    setActivePreset(null);
    setPickerOpen(false);
    void loadRange(draftFrom, draftTo);
  }

  return (
    <section className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-zinc-950">Försäljning</h3>
          <p className="mt-0.5 text-xs text-zinc-500">{periodLabel}</p>
        </div>

        <button
          type="button"
          aria-expanded={pickerOpen}
          aria-controls={pickerId}
          onClick={() => setPickerOpen((open) => !open)}
          className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
        >
          <CalendarIcon />
          Välj period
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <PeriodStat
          label="Intäkter"
          value={`${formatPrice(totalRevenue)} kr`}
          loading={loading}
        />
        <PeriodStat
          label="Antal köp"
          value={String(saleCount)}
          loading={loading}
        />
      </div>

      {pickerOpen ? (
        <div
          id={pickerId}
          className="mt-3 rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50/80 via-white to-white p-3.5"
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">
            Snabbval
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`min-h-9 cursor-pointer rounded-full px-3.5 text-xs font-bold transition ${
                  activePreset === preset.id
                    ? "bg-orange-500 text-white shadow-sm shadow-orange-200"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:border-orange-200 hover:text-orange-700"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-zinc-400">
            Eget datumintervall
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <DateField
              label="Från"
              value={draftFrom}
              max={draftTo || undefined}
              onChange={(value) => {
                setActivePreset(null);
                setDraftFrom(value);
              }}
            />
            <span className="hidden pb-2.5 text-center text-xs font-bold text-zinc-400 sm:block">
              till
            </span>
            <DateField
              label="Till"
              value={draftTo}
              min={draftFrom || undefined}
              onChange={(value) => {
                setActivePreset(null);
                setDraftTo(value);
              }}
            />
          </div>

          <button
            type="button"
            onClick={applyCustomRange}
            className="mt-3 min-h-10 w-full cursor-pointer rounded-xl bg-zinc-900 px-4 text-sm font-bold text-white transition hover:bg-zinc-800"
          >
            Visa försäljning
          </button>
        </div>
      ) : null}

      <div className={`mt-4 transition-opacity ${loading ? "opacity-50" : ""}`}>
        <SalesLineChart days={points} />
      </div>
    </section>
  );
}

function PeriodStat({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl bg-zinc-50 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p className="mt-0.5 text-base font-bold text-zinc-950">
        {loading ? "…" : value}
      </p>
    </div>
  );
}

function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold text-zinc-600">{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 w-full cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-500/10"
      />
    </label>
  );
}

function SalesLineChart({ days }: { days: SalesChartPoint[] }) {
  if (days.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-zinc-500">
        Ingen försäljning i vald period.
      </p>
    );
  }

  const width = Math.max(320, days.length * 28);
  const height = 112;
  const padding = 6;
  const labelStep = days.length <= 14 ? 1 : days.length <= 31 ? 2 : Math.ceil(days.length / 10);

  const points = days.map((day, index) => {
    const x =
      padding +
      (index / Math.max(days.length - 1, 1)) * (width - padding * 2);
    const y =
      height - padding - (day.percent / 100) * (height - padding * 2);
    return { x, y, day };
  });

  const linePath = points
    .map((point, index) =>
      index === 0
        ? `M ${point.x} ${point.y}`
        : `L ${point.x} ${point.y}`,
    )
    .join(" ");

  const areaPath = `${linePath} L ${points.at(-1)?.x ?? width} ${height} L ${points[0]?.x ?? 0} ${height} Z`;

  return (
    <div className="overflow-x-auto pb-1">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-28 min-w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="dashboardSalesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb923c" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#fb923c" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#dashboardSalesFill)" />
        <path
          d={linePath}
          fill="none"
          stroke="#f97316"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <circle
            key={point.day.date}
            cx={point.x}
            cy={point.y}
            r={days.length > 31 ? 2 : 3}
            fill="#fff"
            stroke="#f97316"
            strokeWidth="2"
            opacity={index % labelStep === 0 || index === days.length - 1 ? 1 : 0.35}
          />
        ))}
      </svg>

      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${days.length}, minmax(1.75rem, 1fr))`,
          minWidth: `${width}px`,
        }}
      >
        {days.map((day, index) => (
          <span
            key={day.date}
            className={`truncate text-center text-[10px] font-semibold ${
              index % labelStep === 0 || index === days.length - 1
                ? "text-zinc-500"
                : "text-transparent"
            }`}
            title={`${day.label}: ${formatPrice(day.total)} kr`}
          >
            {day.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="size-4 shrink-0"
      aria-hidden
    >
      <rect
        x="2.5"
        y="4.5"
        width="15"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M2.5 8.5h15" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.5 3v3M13.5 3v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 0,
  }).format(value);
}
