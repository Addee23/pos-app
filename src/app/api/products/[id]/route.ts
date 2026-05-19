import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { productUpdateSchema } from "@/lib/validations/product";
import { isAdmin } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { Prisma } from "@/generated/prisma/client";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const { id } = await context.params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      store: { select: { id: true, name: true } },
      variants: { orderBy: { name: "asc" } },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Produkten hittades inte" }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const parsed = productUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltig data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Produkten hittades inte" }, { status: 404 });
  }

  const data = parsed.data;
  const updates: Prisma.ProductUpdateInput = {
    price: data.price,
    ean: data.ean,
    stockQuantity: data.stockQuantity,
    stockLocation: data.stockLocation,
  };

  const product = await prisma.product.update({
    where: { id },
    data: updates,
    include: {
      store: { select: { id: true, name: true } },
      variants: { orderBy: { name: "asc" } },
    },
  });

  const fields = ["price", "ean", "stockQuantity", "stockLocation"] as const;
  for (const field of fields) {
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

  return NextResponse.json(product);
}
