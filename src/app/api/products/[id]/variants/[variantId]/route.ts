import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { variantUpdateSchema } from "@/lib/validations/product";
import { isAdmin } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

type RouteContext = {
  params: Promise<{ id: string; variantId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const { id: productId, variantId } = await context.params;
  const body = await request.json();
  const parsed = variantUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltig data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.productVariant.findFirst({
    where: { id: variantId, productId },
    include: { product: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Varianten hittades inte" }, { status: 404 });
  }

  const data = parsed.data;
  const variant = await prisma.productVariant.update({
    where: { id: variantId },
    data: {
      price: data.price,
      ean: data.ean,
      stockQuantity: data.stockQuantity,
      stockLocation: data.stockLocation,
    },
  });

  const fields = ["price", "ean", "stockQuantity", "stockLocation"] as const;
  for (const field of fields) {
    const oldVal = String(existing[field] ?? "");
    const newVal = String(variant[field] ?? "");
    if (oldVal !== newVal) {
      await createAuditLog({
        userId: session.user.id,
        storeId: existing.product.storeId,
        entityType: "ProductVariant",
        entityId: variant.id,
        field,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  return NextResponse.json(variant);
}
