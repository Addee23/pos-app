import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  addDays,
  buildSalesChartData,
  formatDateParam,
  formatPeriodLabel,
  resolveSalesRange,
  sumSaleTotals,
} from "@/lib/dashboard-sales-chart";
import { isAdmin } from "../../../../../../rbac";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const { from, to } = resolveSalesRange(
    params.get("from"),
    params.get("to"),
  );

  const sales = await prisma.sale.findMany({
    where: {
      createdAt: {
        gte: from,
        lt: addDays(to, 1),
      },
    },
    select: { total: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const points = buildSalesChartData(sales, from, to);

  return NextResponse.json({
    from: formatDateParam(from),
    to: formatDateParam(to),
    periodLabel: formatPeriodLabel(from, to),
    totalRevenue: sumSaleTotals(sales),
    saleCount: sales.length,
    points,
  });
}
