import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const posSearchSchema = z.object({
  q: z.string().trim().min(1).max(100),
});

type PosSearchItem = {
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

type PosSearchMode = "number" | "name" | "url";

type NormalizedSearch = {
  mode: PosSearchMode;
  rawQuery: string;
  term: string;
  wooId: number | undefined;
};

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!session.user.storeId) {
    return NextResponse.json(
      { error: "Användaren saknar butik" },
      { status: 400 },
    );
  }

  const searchLimit = rateLimit({
    key: `pos-search:${session.user.id}`,
    limit: 120,
    windowMs: 60 * 1000,
  });

  if (!searchLimit.allowed) {
    return NextResponse.json(
      {
        error: `För många sökningar. Vänta ${searchLimit.retryAfterSeconds} sekunder och försök igen.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(searchLimit.retryAfterSeconds) },
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = posSearchSchema.safeParse({
    q: searchParams.get("q") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Skriv ett sökord" }, { status: 400 });
  }

  const search = normalizeSearch(parsed.data.q);

  const products = await prisma.product.findMany({
    where: {
      storeId: session.user.storeId,
      ...(search.mode === "number"
        ? {
            OR: [
              { ean: search.term },
              ...(search.wooId ? [{ wooProductId: search.wooId }] : []),
              { variants: { some: { ean: search.term } } },
              ...(search.wooId
                ? [{ variants: { some: { wooVariantId: search.wooId } } }]
                : []),
            ],
          }
        : search.mode === "url"
          ? {
              OR: [
                { slug: search.term },
                { permalink: { contains: search.term } },
              ],
            }
        : {
            OR: [
              { name: { contains: search.term } },
              { variants: { some: { name: { contains: search.term } } } },
            ],
          }),
    },
    include: {
      variants: { orderBy: { name: "asc" } },
    },
    orderBy: { name: "asc" },
    take: 12,
  });

  const results: PosSearchItem[] = products.flatMap((product) => {
    const productMatches = productMatchesSearch(product, search);
    const productItem: PosSearchItem[] =
      product.variants.length === 0 && productMatches
        ? [
            {
              type: "product",
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
              description:
                product.metaDescription ??
                "Metabeskrivning saknas för den här produkten.",
              imageUrl: product.imageUrl,
            },
          ]
        : [];

    const variantItems = product.variants
      .filter((variant) => variantMatchesSearch(variant, productMatches, search))
      .map((variant): PosSearchItem => ({
        type: "variant",
        productId: product.id,
        variantId: variant.id,
        wooProductId: product.wooProductId,
        wooVariantId: variant.wooVariantId,
        productName: product.name,
        variantName: variant.name,
        ean: variant.ean,
        price: Number(variant.price),
        stockQuantity: variant.stockQuantity,
        stockLocation: variant.stockLocation,
        description:
          variant.metaDescription ??
          product.metaDescription ??
          "Metabeskrivning saknas för den här varianten.",
        imageUrl: variant.imageUrl ?? product.imageUrl,
      }));

    return [...productItem, ...variantItems];
  });

  const exactMatch = findExactMatch(results, search);

  return NextResponse.json({
    mode: search.mode,
    exactMatch,
    results,
  });
}

function normalizeSearch(query: string): NormalizedSearch {
  const rawQuery = query.trim();

  if (/^https?:\/\//i.test(rawQuery)) {
    const slug = extractSlugFromUrl(rawQuery);
    return {
      mode: "url",
      rawQuery,
      term: slug || rawQuery,
      wooId: undefined,
    };
  }

  const isNumberSearch = /^\d+$/.test(rawQuery);
  return {
    mode: isNumberSearch ? "number" : "name",
    rawQuery,
    term: rawQuery,
    wooId: Number.isSafeInteger(Number(rawQuery)) ? Number(rawQuery) : undefined,
  };
}

function productMatchesSearch(
  product: {
    ean: string | null;
    name: string;
    permalink: string | null;
    slug: string;
    wooProductId: number;
  },
  search: NormalizedSearch,
): boolean {
  if (search.mode === "number") {
    return product.ean === search.term || product.wooProductId === search.wooId;
  }

  if (search.mode === "url") {
    return (
      product.slug === search.term ||
      Boolean(product.permalink?.includes(search.term))
    );
  }

  return product.name.toLowerCase().includes(search.term.toLowerCase());
}

function variantMatchesSearch(
  variant: {
    ean: string | null;
    name: string;
    wooVariantId: number;
  },
  productMatches: boolean,
  search: NormalizedSearch,
): boolean {
  if (search.mode === "number") {
    return variant.ean === search.term || variant.wooVariantId === search.wooId;
  }

  if (search.mode === "url") {
    return productMatches;
  }

  return (
    productMatches ||
    variant.name.toLowerCase().includes(search.term.toLowerCase())
  );
}

function findExactMatch(
  results: PosSearchItem[],
  search: NormalizedSearch,
): PosSearchItem | null {
  if (search.mode !== "number") {
    return null;
  }

  return (
    results.find(
      (item) =>
        item.ean === search.term ||
        item.wooProductId === search.wooId ||
        item.wooVariantId === search.wooId,
    ) ?? null
  );
}

function extractSlugFromUrl(value: string): string {
  try {
    const url = new URL(value);
    return url.pathname
      .split("/")
      .filter(Boolean)
      .at(-1)
      ?.trim() ?? "";
  } catch {
    return "";
  }
}
