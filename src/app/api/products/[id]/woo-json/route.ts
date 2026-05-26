import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatWooJsonForEditor, productToWooJson } from "@/lib/product-woo-json";
import { isAdmin } from "@/lib/rbac";

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

  const wooJson = productToWooJson(product);

  return NextResponse.json({
    productId: product.id,
    storeId: product.storeId,
    storeName: product.store.name,
    wooProductId: product.wooProductId,
    json: wooJson,
    jsonText: formatWooJsonForEditor(wooJson),
  });
}
