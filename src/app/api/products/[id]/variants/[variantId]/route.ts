import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { variantUpdateSchema } from "@/lib/validations/product";
import { rateLimit } from "@/lib/rate-limit";
import { isAdmin } from "../../../../../../../rbac";
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

  const updateLimit = rateLimit({
    key: `variant-update:${session.user.id}`,
    limit: 30,
    windowMs: 60 * 1000,
  });

  if (!updateLimit.allowed) {
    return tooManyRequests(updateLimit.retryAfterSeconds);
  }

  const { id: productId, variantId } = await context.params;
  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const parsed = variantUpdateSchema.safeParse(body.data);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltig data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      include: { product: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Varianten hittades inte" },
        { status: 404 },
      );
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
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunde inte spara varianten" },
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

function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      error: `För många anrop. Vänta ${retryAfterSeconds} sekunder och försök igen.`,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}
