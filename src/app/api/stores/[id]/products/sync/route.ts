import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  fetchAllWooProducts,
  hasWooCredentials,
  importWooProductsForStore,
} from "@/lib/product-import";
import { isAdmin } from "../../../../../../../rbac";
import { rateLimit } from "@/lib/rate-limit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const syncLimit = rateLimit({
    key: `product-sync:${session.user.id}`,
    limit: 5,
    windowMs: 60 * 1000,
  });

  if (!syncLimit.allowed) {
    return NextResponse.json(
      {
        error: `För många synkroniseringar. Vänta ${syncLimit.retryAfterSeconds} sekunder.`,
      },
      { status: 429 },
    );
  }

  const { id: storeId } = await context.params;
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
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
          "WooCommerce saknas för butiken. Fyll i URL och API-nycklar under Admin → Inställningar.",
      },
      { status: 400 },
    );
  }

  try {
    const rawProducts = await fetchAllWooProducts(store);
    const result = await importWooProductsForStore(prisma, store, rawProducts);

    return NextResponse.json({
      ...result,
      fetchedFromWoo: rawProducts.length,
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error
        ? error.message
        : "Kunde inte uppdatera produkter från WooCommerce";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
