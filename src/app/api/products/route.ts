import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { productSearchSchema } from "@/lib/validations/product";
import { isAdmin } from "@/lib/rbac";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = productSearchSchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    storeId: searchParams.get("storeId") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltiga sökparametrar" }, { status: 400 });
  }

  const { q, storeId } = parsed.data;

  const products = await prisma.product.findMany({
    where: {
      ...(storeId ? { storeId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { ean: { contains: q } },
              { slug: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      store: { select: { id: true, name: true } },
      variants: { orderBy: { name: "asc" } },
    },
    orderBy: { name: "asc" },
    take: 50,
  });

  return NextResponse.json(products);
}
