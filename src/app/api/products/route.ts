import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAuditLog } from "@/lib/audit";
import {
  allocateLocalWooProductId,
  uniqueProductSlugForStore,
} from "@/lib/product-create";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isAdmin } from "../../../../rbac";
import {
  productCreateSchema,
  productSearchSchema,
} from "@/lib/validations/product";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const listLimit = rateLimit({
    key: `product-list:${session.user.id}`,
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (!listLimit.allowed) {
    return NextResponse.json(
      {
        error: `För många förfrågningar. Vänta ${listLimit.retryAfterSeconds} sekunder.`,
      },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = productSearchSchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    storeId: searchParams.get("storeId") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltiga sökparametrar" }, { status: 400 });
  }

  const { q, storeId } = parsed.data;

  const products = await prisma.product.findMany({
    where: {
      ...(storeId ? { storeId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { ean: { contains: q } },
              { slug: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      store: { select: { id: true, name: true } },
      variants: { orderBy: { name: "asc" } },
    },
    orderBy: { name: "asc" },
    take: 50,
  });

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const createLimit = rateLimit({
    key: `product-create:${session.user.id}`,
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (!createLimit.allowed) {
    return NextResponse.json(
      {
        error: `För många anrop. Vänta ${createLimit.retryAfterSeconds} sekunder och försök igen.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(createLimit.retryAfterSeconds) },
      },
    );
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const parsed = productCreateSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltig data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  try {
    const store = await prisma.store.findUnique({
      where: { id: data.storeId },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json({ error: "Butiken finns inte" }, { status: 404 });
    }

    const wooProductId = await allocateLocalWooProductId(prisma, store.id);
    const slug = await uniqueProductSlugForStore(prisma, store.id, data.name);

    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        wooProductId,
        name: data.name,
        slug,
        productType: "SIMPLE",
        price: data.price,
        ean: data.ean,
        stockQuantity: data.stockQuantity,
        stockLocation: data.stockLocation,
        shortDescription: data.shortDescription,
        category: data.category,
        brand: data.brand,
        country: data.country,
      },
      select: { id: true, name: true, storeId: true },
    });

    await createAuditLog({
      userId: session.user.id,
      storeId: product.storeId,
      entityType: "Product",
      entityId: product.id,
      field: "created",
      oldValue: null,
      newValue: product.name,
    });

    return NextResponse.json({ id: product.id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunde inte skapa produkten" },
      { status: 500 },
    );
  }
}

async function readJsonBody(
  request: Request,
): Promise<{ ok: true; data: unknown } | { ok: false }> {
  try {
    return { ok: true, data: await request.json() };
  } catch {
    return { ok: false };
  }
}
