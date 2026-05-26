import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isAdmin } from "@/lib/rbac";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  const stores = await prisma.store.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });

  return NextResponse.json(stores);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const createLimit = rateLimit({
    key: `store-create:${session.user.id}`,
    limit: 10,
    windowMs: 60 * 1000,
  });

  if (!createLimit.allowed) {
    return NextResponse.json(
      {
        error: `För många anrop. Vänta ${createLimit.retryAfterSeconds} sekunder och försök igen.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(createLimit.retryAfterSeconds) },
      },
    );
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const name =
    typeof body.data.name === "string" ? body.data.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Butiksnamn krävs" }, { status: 400 });
  }

  const store = await createStoreWithUniqueSlug(name);

  return NextResponse.json(store, { status: 201 });
}

async function createStoreWithUniqueSlug(name: string) {
  const baseSlug = slugify(name) || "butik";

  for (let index = 1; index <= 20; index += 1) {
    const slug = index === 1 ? baseSlug : `${baseSlug}-${index}`;

    try {
      return await prisma.store.create({
        data: { name, slug },
        select: { id: true, name: true, slug: true },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Kunde inte skapa en unik butik-slug.");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function readJsonBody(
  request: Request,
): Promise<{ ok: true; data: { name?: unknown } } | { ok: false }> {
  try {
    return { ok: true, data: await request.json() };
  } catch {
    return { ok: false };
  }
}

function isUniqueConstraintError(error: unknown): error is { code: "P2002" } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
