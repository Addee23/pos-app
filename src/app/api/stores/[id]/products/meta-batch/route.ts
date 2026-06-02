import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  forbidden,
  tooManyRequests,
  unauthorized,
} from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "../../../../../../../rbac";
import { rateLimit } from "@/lib/rate-limit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  if (!isAdmin(session.user.role)) {
    return forbidden();
  }

  const batchLimit = rateLimit({
    key: `meta-batch-read:${session.user.id}`,
    limit: 30,
    windowMs: 60 * 1000,
  });

  if (!batchLimit.allowed) {
    return tooManyRequests(batchLimit.retryAfterSeconds);
  }

  const { id } = await context.params;
  const limit = parseLimit(new URL(request.url).searchParams.get("limit"));

  const store = await prisma.store.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!store) {
    return NextResponse.json({ error: "Butiken finns inte" }, { status: 404 });
  }

  const products = await prisma.product.findMany({
    where: { storeId: id },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      shortDescription: true,
      metaDescription: true,
      wooProductId: true,
      category: true,
      brand: true,
      country: true,
    },
  });

  return NextResponse.json({
    storeId: store.id,
    storeName: store.name,
    limit,
    items: products,
  });
}

function parseLimit(value: string | null): number {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1) {
    return 10;
  }

  return Math.min(limit, 10);
}
