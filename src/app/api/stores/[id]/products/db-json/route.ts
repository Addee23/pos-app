import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "../../../../../../../rbac";
import { rateLimit } from "@/lib/rate-limit";
import { formatWooJsonForEditor, parseProductsFromJsonInput } from "@/lib/product-woo-json";
import { readFile } from "fs/promises";
import { resolve } from "path";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });

  const limit = rateLimit({ key: `db-json:${session.user.id}`, limit: 20, windowMs: 60_000 });
  if (!limit.allowed) return NextResponse.json({ error: "För många anrop." }, { status: 429 });

  const { id } = await context.params;

  const dbProducts = await prisma.product.findMany({
    where: { storeId: id },
    orderBy: { name: "asc" },
    take: 10,
    select: { name: true, wooProductId: true, ean: true, price: true, stockQuantity: true, wooMetadata: true },
  });

  if (dbProducts.length > 0) {
    return NextResponse.json({ jsonText: formatWooJsonForEditor(dbProducts), count: dbProducts.length, source: "db" });
  }

  // Fallback: läs från cigarr.json
  try {
    const raw = await readFile(resolve(process.cwd(), "data/cigarr.json"), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const products = parseProductsFromJsonInput(parsed);
    if (!products || products.length === 0) {
      return NextResponse.json({ error: "Inga produkter hittades i cigarr.json." }, { status: 404 });
    }
    const slice = products.slice(0, 10);
    return NextResponse.json({ jsonText: formatWooJsonForEditor(slice), count: slice.length, source: "local" });
  } catch {
    return NextResponse.json(
      { error: "Inga produkter i databasen och cigarr.json kunde inte läsas." },
      { status: 404 },
    );
  }
}
