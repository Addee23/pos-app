import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isAdmin } from "../../../../../../rbac";
import { encryptSecret } from "@/lib/secret-crypto";
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

  const updateLimit = rateLimit({
    key: `settings-update:${session.user.id}`,
    limit: 20,
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

  const parsed = storeSettingsSchema.safeParse(body.data);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltig data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.store.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Butiken hittades inte" },
        { status: 404 },
      );
    }

    const {
      wooConsumerKey,
      wooConsumerSecret,
      wooWebhookSecret,
      smtpUser,
      smtpPass,
      ...settingsData
    } = parsed.data;

    const store = await prisma.store.update({
      where: { id },
      data: {
        ...settingsData,
        ...(wooConsumerKey ? { wooConsumerKey: encryptSecret(wooConsumerKey) } : {}),
        ...(wooConsumerSecret
          ? { wooConsumerSecret: encryptSecret(wooConsumerSecret) }
          : {}),
        ...(wooWebhookSecret
          ? { wooWebhookSecret: encryptSecret(wooWebhookSecret) }
          : {}),
        ...(smtpUser ? { smtpUser: encryptSecret(smtpUser) } : {}),
        ...(smtpPass ? { smtpPass: encryptSecret(smtpPass) } : {}),
      },
    });

    return NextResponse.json(store);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunde inte spara inställningar" },
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
