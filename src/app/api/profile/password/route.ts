import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { passwordChangeSchema } from "@/lib/validations/auth";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  const changeLimit = rateLimit({
    key: `password-change:${session.user.id}`,
    limit: 5,
    windowMs: 60 * 1000,
  });

  if (!changeLimit.allowed) {
    return NextResponse.json(
      {
        error: `För många försök. Vänta ${changeLimit.retryAfterSeconds} sekunder och försök igen.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(changeLimit.retryAfterSeconds) },
      },
    );
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const parsed = passwordChangeSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltig data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Användaren hittades inte" },
        { status: 404 },
      );
    }

    const currentPasswordIsValid = await compare(
      parsed.data.currentPassword,
      user.passwordHash,
    );

    if (!currentPasswordIsValid) {
      return NextResponse.json(
        { error: "Nuvarande lösenord stämmer inte" },
        { status: 400 },
      );
    }

    const passwordHash = await hash(parsed.data.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunde inte byta lösenord" },
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
