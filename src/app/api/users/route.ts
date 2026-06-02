import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isAdmin } from "../../../../rbac";
import { userCreateSchema } from "@/lib/validations/user";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      storeId: true,
      createdAt: true,
      store: { select: { id: true, name: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(users);
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
    key: `user-create:${session.user.id}`,
    limit: 10,
    windowMs: 60 * 1000,
  });

  if (!createLimit.allowed) {
    return tooManyRequests(createLimit.retryAfterSeconds);
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const parsed = userCreateSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltig data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const store = await prisma.store.findUnique({
      where: { id: parsed.data.storeId },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json({ error: "Butiken hittades inte" }, { status: 404 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Det finns redan en användare med den e-postadressen" },
        { status: 409 },
      );
    }

    const passwordHash = await hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash,
        role: parsed.data.role,
        storeId: parsed.data.storeId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        storeId: true,
        createdAt: true,
        store: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunde inte skapa användaren" },
      { status: 500 },
    );
  }
}

async function readJsonBody(
  request: Request,
): Promise<{ ok: true; data: unknown } | { ok: false }> {
  try {
    return { ok: true, data: await request.json() };
  } catch {
    return { ok: false };
  }
}

function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      error: `För många anrop. Vänta ${retryAfterSeconds} sekunder och försök igen.`,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}
