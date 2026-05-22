import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { pickupSearchSchema } from "@/lib/validations/pickup";

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

  const query = parsed.data.q;

  const pickups = await prisma.pickup.findMany({
    where: {
      storeId: session.user.storeId,
      ...(query
        ? {
            OR: [
              { customerName: { contains: query } },
              { pickupCode: { contains: query } },
            ],
          }
        : {}),
    },
    include: {
      pickedUpBy: { select: { name: true, email: true } },
    },
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
