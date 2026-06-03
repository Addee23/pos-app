import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { buildMetaBatchProductWhere } from "@/lib/meta-batch";
import { isAdmin } from "../../../../../../../../rbac";
import { rateLimit } from "@/lib/rate-limit";
import { productMetaBatchSaveSchema } from "@/lib/validations/product-meta";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const saveLimit = rateLimit({
    key: `meta-batch-save:${session.user.id}`,
    limit: 15,
    windowMs: 60 * 1000,
  });

  if (!saveLimit.allowed) {
    return NextResponse.json(
      { error: "För många sparförsök. Vänta en stund." },
      { status: 429 },
    );
  }

  const { id: storeId } = await context.params;
  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const parsed = productMetaBatchSaveSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltig data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true },
  });

  if (!store) {
    return NextResponse.json({ error: "Butiken finns inte" }, { status: 404 });
  }

  const { groupBy, rows } = parsed.data;
  let savedProducts = 0;

  for (const row of rows) {
    const products = await prisma.product.findMany({
      where: buildMetaBatchProductWhere(storeId, groupBy, row.key),
      select: {
        id: true,
        storeId: true,
        shortDescription: true,
        metaDescription: true,
      },
    });

    for (const existing of products) {
      const product = await prisma.product.update({
        where: { id: existing.id },
        data: {
          shortDescription: row.shortDescription,
          metaDescription: row.metaDescription,
        },
      });

      savedProducts += 1;

      for (const field of ["shortDescription", "metaDescription"] as const) {
        const oldVal = String(existing[field] ?? "");
        const newVal = String(product[field] ?? "");
        if (oldVal !== newVal) {
          await createAuditLog({
            userId: session.user.id,
            storeId: product.storeId,
            entityType: "Product",
            entityId: product.id,
            field,
            oldValue: oldVal,
            newValue: newVal,
          });
        }
      }
    }
  }

  return NextResponse.json({
    savedProducts,
    savedGroups: rows.length,
    groupBy,
  });
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
