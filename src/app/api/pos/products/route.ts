import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

const IN_STOCK_WHERE = {
  OR: [
    { productType: "SIMPLE" as const, stockQuantity: { gt: 0 } },
    { productType: "VARIABLE" as const, variants: { some: { stockQuantity: { gt: 0 } } } },
  ],
};

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const paramStoreId = searchParams.get("storeId");

  if (!paramStoreId) {
    return NextResponse.json({ error: "Ange storeId" }, { status: 400 });
  }
  const userStoreId = paramStoreId;

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where = { storeId: userStoreId, ...IN_STOCK_WHERE };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { variants: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
      skip,
      take: PAGE_SIZE,
    }),
  ]);

  type PosItem = {
    type: "product" | "variant";
    productId: string;
    variantId: string | null;
    wooProductId: number;
    wooVariantId: number | null;
    productName: string;
    variantName: string | null;
    ean: string | null;
    price: number;
    stockQuantity: number;
    stockLocation: string | null;
    description: string;
    imageUrl: string | null;
  };

  const items = products.flatMap((product): PosItem[] => {
    if (product.variants.length === 0) {
      return [
        {
          type: "product" as const,
          productId: product.id,
          variantId: null,
          wooProductId: product.wooProductId,
          wooVariantId: null,
          productName: product.name,
          variantName: null,
          ean: product.ean,
          price: Number(product.price),
          stockQuantity: product.stockQuantity,
          stockLocation: product.stockLocation,
          description: product.metaDescription ?? "Metabeskrivning saknas.",
          imageUrl: product.imageUrl,
        },
      ];
    }

    return product.variants
      .filter((v) => v.stockQuantity > 0)
      .map((v) => ({
        type: "variant" as const,
        productId: product.id,
        variantId: v.id,
        wooProductId: product.wooProductId,
        wooVariantId: v.wooVariantId,
        productName: product.name,
        variantName: v.name,
        ean: v.ean,
        price: Number(v.price),
        stockQuantity: v.stockQuantity,
        stockLocation: v.stockLocation,
        description: v.metaDescription ?? product.metaDescription ?? "Metabeskrivning saknas.",
        imageUrl: v.imageUrl ?? product.imageUrl,
      }));
  });

  return NextResponse.json({ items, hasMore: skip + PAGE_SIZE < total, total });
}

