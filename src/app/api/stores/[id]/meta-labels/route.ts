import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { isAdmin } from "../../../../../../rbac";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });

  const { id } = await context.params;

  try {
    const store = await prisma.store.findUnique({
      where: { id },
      select: { metaLabels: true },
    });
    if (!store) return NextResponse.json({ error: "Butiken hittades inte" }, { status: 404 });

    const labels = (store.metaLabels ?? {}) as Record<string, string>;
    return NextResponse.json({ labels });
  } catch (err) {
    console.error("[meta-labels GET]", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Serverfel: ${detail}` }, { status: 500 });
  }
}

const metaLabelsSchema = z.record(z.string(), z.string().max(80));

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });

  const saveLimit = rateLimit({
    key: `meta-labels-save:${session.user.id}`,
    limit: 20,
    windowMs: 60 * 1000,
  });
  if (!saveLimit.allowed) {
    return NextResponse.json({ error: "För många anrop. Vänta en stund." }, { status: 429 });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const parsed = metaLabelsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig data" }, { status: 400 });
  }

  const cleaned: Record<string, string> = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => (v as string).trim() !== ""),
  );

  try {
    const store = await prisma.store.update({
      where: { id },
      data: { metaLabels: cleaned as Prisma.InputJsonValue },
      select: { metaLabels: true },
    });
    return NextResponse.json({ labels: store.metaLabels });
  } catch (err) {
    console.error("[meta-labels PATCH]", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Serverfel: ${detail}` }, { status: 500 });
  }
}
