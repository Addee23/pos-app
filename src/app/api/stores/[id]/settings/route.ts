import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { storeSettingsSchema } from "@/lib/validations/settings";

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

  const { id } = await context.params;
  const body = await request.json();
  const parsed = storeSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltig data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.store.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Butiken hittades inte" }, { status: 404 });
  }

  const store = await prisma.store.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(store);
}
