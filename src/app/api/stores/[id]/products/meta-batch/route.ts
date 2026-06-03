import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  forbidden,
  tooManyRequests,
  unauthorized,
} from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import {
  buildStoredMetaPreviewRows,
  collectAvailableMetaKeys,
  normalizeWooMetaFieldInput,
} from "@/lib/woo-meta-preview";
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
  const field = normalizeWooMetaFieldInput(
    new URL(request.url).searchParams.get("field") ?? "",
  );

  if (!field) {
    return NextResponse.json(
      {
        error:
          "Ange vilket meta-fält du vill söka på, t.ex. land, format eller smak.",
      },
      { status: 400 },
    );
  }

  const store = await prisma.store.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!store) {
    return NextResponse.json({ error: "Butiken finns inte" }, { status: 404 });
  }

  const products = await prisma.product.findMany({
    where: { storeId: id },
    orderBy: { name: "asc" },
    select: {
      name: true,
      metaDescription: true,
      shortDescription: true,
      wooMetadata: true,
    },
  });

  const availableFields = collectAvailableMetaKeys(products);
  const rows = buildStoredMetaPreviewRows(products, field);
  const productsWithMetadata = products.filter((product) => {
    return (
      product.wooMetadata &&
      typeof product.wooMetadata === "object" &&
      !Array.isArray(product.wooMetadata) &&
      Object.keys(product.wooMetadata as Record<string, unknown>).length > 0
    );
  }).length;

  return NextResponse.json({
    storeId: store.id,
    storeName: store.name,
    field,
    source: "database",
    productCount: products.length,
    productsWithMetadata,
    availableFields,
    rows,
  });
}
