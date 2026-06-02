export type SalesChartPoint = {
  date: string;
  label: string;
  total: number;
  percent: number;
};

export type SalesRange = {
  from: Date;
  to: Date;
};

const MAX_RANGE_DAYS = 366;

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function formatDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateParam(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return startOfDay(date);
}

export function resolveSalesRange(
  fromParam: string | null | undefined,
  toParam: string | null | undefined,
): SalesRange {
  const today = startOfDay(new Date());
  let from = parseDateParam(fromParam) ?? addDays(today, -6);
  let to = parseDateParam(toParam) ?? today;

  if (from.getTime() > to.getTime()) {
    [from, to] = [to, from];
  }

  const maxFrom = addDays(to, -(MAX_RANGE_DAYS - 1));
  if (from.getTime() < maxFrom.getTime()) {
    from = maxFrom;
  }

  return { from, to };
}

export function countDaysInRange(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerDay) + 1;
}

export function buildSalesChartData(
  sales: { total: unknown; createdAt: Date }[],
  from: Date,
  to: Date,
): SalesChartPoint[] {
  const rangeDays = countDaysInRange(from, to);
  const days = Array.from({ length: rangeDays }, (_, index) => {
    const date = addDays(from, index);
    return {
      date: formatDateParam(date),
      label: formatChartLabel(date, rangeDays),
      total: 0,
      percent: 0,
    };
  });

  for (const sale of sales) {
    const saleDate = startOfDay(new Date(sale.createdAt));
    const key = formatDateParam(saleDate);
    const day = days.find((item) => item.date === key);
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

export function sumSaleTotals(sales: { total: unknown }[]): number {
  return sales.reduce((sum, sale) => sum + Number(sale.total), 0);
}

export function formatPeriodLabel(from: Date, to: Date): string {
  const sameYear = from.getFullYear() === to.getFullYear();
  const sameMonth =
    sameYear && from.getMonth() === to.getMonth() && from.getDate() === to.getDate();

  if (sameMonth) {
    return new Intl.DateTimeFormat("sv-SE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(from);
  }

  const fromFmt: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  };
  const toFmt: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };

  const fromLabel = new Intl.DateTimeFormat("sv-SE", fromFmt).format(from);
  const toLabel = new Intl.DateTimeFormat("sv-SE", toFmt).format(to);
  return `${fromLabel} – ${toLabel}`;
}

function formatChartLabel(date: Date, rangeDays: number): string {
  if (rangeDays <= 14) {
    return new Intl.DateTimeFormat("sv-SE", { weekday: "short" }).format(date);
  }

  if (rangeDays <= 62) {
    return new Intl.DateTimeFormat("sv-SE", {
      day: "numeric",
      month: "short",
    }).format(date);
  }

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "numeric",
  }).format(date);
}
