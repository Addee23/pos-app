import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { Prisma } from "@/generated/prisma/client";
import { pickupResponseInclude } from "@/lib/pickup-serialize";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { pickupSearchSchema } from "@/lib/validations/pickup";

type PickupSearchMode = "code" | "text" | "url";

type NormalizedPickupSearch = {
  mode: PickupSearchMode;
  term: string;
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
    key: `pickup-search:${session.user.id}`,
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (!searchLimit.allowed) {
    return tooManyRequests(searchLimit.retryAfterSeconds);
  }

  const { searchParams } = new URL(request.url);
  const parsed = pickupSearchSchema.safeParse({
    q: searchParams.get("q") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltiga sökparametrar", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const search = normalizePickupSearch(parsed.data.q ?? "");

  const pickups = await prisma.pickup.findMany({
    where: {
      storeId: session.user.storeId,
      ...(search ? buildPickupSearchWhere(search) : {}),
    },
    include: pickupResponseInclude,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 30,
  });

  return NextResponse.json(pickups);
}

function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      error: `För många sökningar. Vänta ${retryAfterSeconds} sekunder och försök igen.`,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}

function normalizePickupSearch(query: string): NormalizedPickupSearch | null {
  const rawQuery = query.trim();

  if (rawQuery.length === 0) {
    return null;
  }

  // Samma idé som produktflödet:
  // https-länk betyder att vi letar efter produktens slug i upphämtningen.
  if (/^https?:\/\//i.test(rawQuery)) {
    const slug = extractSlugFromUrl(rawQuery);

    return {
      mode: "url",
      term: slug || rawQuery,
    };
  }

  // En upphämtningskod kan vara både ren siffra och t.ex. HAMTA-1001.
  const looksLikePickupCode = /^[a-zåäö0-9-]+$/i.test(rawQuery) && /\d/.test(rawQuery);

  return {
    mode: looksLikePickupCode ? "code" : "text",
    term: rawQuery,
  };
}

function buildPickupSearchWhere(
  search: NormalizedPickupSearch,
): Prisma.PickupWhereInput {
  if (search.mode === "url") {
    return {
      items: {
        some: {
          OR: [
            { productSlug: search.term },
            { productSlug: { contains: search.term } },
          ],
        },
      },
    };
  }

  if (search.mode === "code") {
    return {
      OR: [
        { pickupCode: search.term },
        { pickupCode: { contains: search.term } },
      ],
    };
  }

  return {
    OR: [
      { customerName: { contains: search.term } },
      { pickupCode: { contains: search.term } },
      { items: { some: { productName: { contains: search.term } } } },
      { items: { some: { productSlug: { contains: search.term } } } },
    ],
  };
}

function extractSlugFromUrl(value: string): string {
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);

    return parts.at(-1) ?? "";
  } catch {
    return "";
  }
}
