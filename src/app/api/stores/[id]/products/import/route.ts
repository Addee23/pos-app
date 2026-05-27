import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { importWooProductsForStore } from "@/lib/product-import";
import { rateLimit } from "@/lib/rate-limit";
import { isAdmin } from "@/lib/rbac";

type ImportRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: ImportRouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const importLimit = rateLimit({
    key: `product-import:${session.user.id}`,
    limit: 10,
    windowMs: 60 * 1000,
  });

  if (!importLimit.allowed) {
    return NextResponse.json(
      {
        error: `För många importer. Vänta ${importLimit.retryAfterSeconds} sekunder och försök igen.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(importLimit.retryAfterSeconds) },
      },
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

  const body = await readJsonBody(request);
  if (!body.ok || !Array.isArray(body.data.products)) {
    return NextResponse.json(
      { error: "Skicka JSON som { products: [...] }" },
      { status: 400 },
    );
  }

  const updateOnly = body.data.updateOnly === true;

  try {
    const result = await importWooProductsForStore(
      prisma,
      store,
      body.data.products,
      { updateOnly },
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Importen misslyckades. Kontrollera JSON och WooCommerce-nycklar." },
      { status: 500 },
    );
  }
}

async function readJsonBody(
  request: Request,
): Promise<
  | { ok: true; data: { products?: unknown; updateOnly?: boolean } }
  | { ok: false }
> {
  try {
    return { ok: true, data: await request.json() };
  } catch {
    return { ok: false };
  }
}
