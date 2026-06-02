import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isAdmin } from "../../../../../rbac";
import { userUpdateSchema } from "@/lib/validations/user";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const updateLimit = rateLimit({
    key: `user-update:${session.user.id}`,
    limit: 30,
    windowMs: 60 * 1000,
  });

  if (!updateLimit.allowed) {
    return tooManyRequests(updateLimit.retryAfterSeconds);
  }

  const { id } = await context.params;
  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const parsed = userUpdateSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltig data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (id === session.user.id && parsed.data.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Du kan inte ta bort din egen admin-roll" },
      { status: 400 },
    );
  }

  try {
    const [existingUser, store] = await Promise.all([
      prisma.user.findUnique({ where: { id }, select: { id: true } }),
      prisma.store.findUnique({
        where: { id: parsed.data.storeId },
        select: { id: true },
      }),
    ]);

    if (!existingUser) {
      return NextResponse.json(
        { error: "Användaren hittades inte" },
        { status: 404 },
      );
    }

    if (!store) {
      return NextResponse.json({ error: "Butiken hittades inte" }, { status: 404 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        name: parsed.data.name,
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

    return NextResponse.json(user);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunde inte uppdatera användaren" },
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
