import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  forbidden,
  tooManyRequests,
  unauthorized,
} from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { formatWooJsonForEditor, productToWooJson } from "@/lib/product-woo-json";
import { isAdmin } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  if (!isAdmin(session.user.role)) {
    return forbidden();
  }

  const jsonLimit = rateLimit({
    key: `product-woo-json:${session.user.id}`,
    limit: 40,
    windowMs: 60 * 1000,
  });

  if (!jsonLimit.allowed) {
    return tooManyRequests(jsonLimit.retryAfterSeconds);
  }

  const { id } = await context.params;

  try {
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
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunde inte hämta produkt-JSON" },
      { status: 500 },
    );
  }
}
