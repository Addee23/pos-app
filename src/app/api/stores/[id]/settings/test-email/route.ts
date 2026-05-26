import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { MailConfigurationError, resolveSmtpConfig, sendTestEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isAdmin } from "@/lib/rbac";
import { testEmailSchema } from "@/lib/validations/settings";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const testLimit = rateLimit({
    key: `smtp-test:${session.user.id}`,
    limit: 10,
    windowMs: 60 * 1000,
  });

  if (!testLimit.allowed) {
    return NextResponse.json(
      { error: `För många test. Vänta ${testLimit.retryAfterSeconds} sekunder.` },
      { status: 429 },
    );
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const parsed = testEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltig e-postadress", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const store = await prisma.store.findUnique({
    where: { id },
    select: {
      id: true,
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      smtpUser: true,
      smtpPass: true,
      smtpFrom: true,
    },
  });

  if (!store) {
    return NextResponse.json({ error: "Butiken hittades inte" }, { status: 404 });
  }

  try {
    const smtpConfig = resolveSmtpConfig(store);
    await sendTestEmail(smtpConfig, parsed.data.recipient);

    return NextResponse.json({
      message: `Testmail skickades till ${parsed.data.recipient}`,
    });
  } catch (error) {
    if (error instanceof MailConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("test-email failed", error);
    return NextResponse.json(
      {
        error:
          "Kunde inte skicka testmail. Kontrollera SMTP-uppgifter (för Gmail: app-lösenord).",
      },
      { status: 500 },
    );
  }
}
