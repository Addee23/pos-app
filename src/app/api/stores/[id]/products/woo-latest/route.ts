import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatWooJsonForEditor } from "@/lib/product-woo-json";
import { isAdmin } from "../../../../../../../rbac";
import { rateLimit } from "@/lib/rate-limit";
import { fetchLatestWooProducts, hasWooCredentials } from "@/lib/woocommerce-api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const limit = parseLimit(new URL(request.url).searchParams.get("limit"));
  const fetchLimit = rateLimit({
    key: `woo-latest:${session.user.id}`,
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (!fetchLimit.allowed) {
    return NextResponse.json(
      { error: "För många förfrågningar. Försök igen om en stund." },
      { status: 429 },
    );
  }

  const { id } = await context.params;

  const store = await prisma.store.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      wooUrl: true,
      wooConsumerKey: true,
      wooConsumerSecret: true,
    },
  });

  if (!store) {
    return NextResponse.json({ error: "Butiken finns inte" }, { status: 404 });
  }

  if (!hasWooCredentials(store)) {
    return NextResponse.json(
      {
        error:
          "WooCommerce saknas för butiken. Fyll i URL och API-nycklar under Admin → Inställningar, eller kör npm run setup:woo.",
      },
      { status: 400 },
    );
  }

  try {
    const products = await fetchLatestWooProducts(store, limit);

    return NextResponse.json({
      storeId: store.id,
      storeName: store.name,
      count: products.length,
      limit,
      products,
      jsonText: formatWooJsonForEditor(products),
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Kunde inte hämta produkter från WooCommerce";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function parseLimit(value: string | null): number {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1) {
    return 10;
  }

  return Math.min(limit, 50);
}
