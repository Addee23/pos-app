import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  MailConfigurationError,
  resolveSmtpConfig,
  sendPickupReadyEmail,
} from "@/lib/mail";
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
      name: true,
      address: true,
      logoUrl: true,
      thankYouMessage: true,
      returnText: true,
      receiptFooter: true,
      products: {
        orderBy: { name: "asc" },
        take: 2,
        select: {
          name: true,
          imageUrl: true,
          metaDescription: true,
          shortDescription: true,
          variants: {
            orderBy: { name: "asc" },
            take: 1,
            select: {
              name: true,
              imageUrl: true,
              metaDescription: true,
              shortDescription: true,
            },
          },
        },
      },
    },
  });

  if (!store) {
    return NextResponse.json({ error: "Butiken hittades inte" }, { status: 404 });
  }

  try {
    const smtpConfig = resolveSmtpConfig(store);

    // Testknappen ska visa samma typ av mail som kunden får när en order är redo.
    await sendPickupReadyEmail(
      {
        customerEmail: parsed.data.recipient,
        customerName: "Testkund",
        pickupCode: "TEST-ORDER",
        notes:
          "Det här är en förhandsvisning av mailet som skickas när en order är redo för upphämtning.",
        store: {
          name: store.name,
          address: store.address,
          logoUrl: store.logoUrl,
          thankYouMessage: store.thankYouMessage,
          returnText: store.returnText,
          receiptFooter: store.receiptFooter,
        },
        items:
          store.products.length > 0
            ? store.products.map((product) => {
                const variant = product.variants[0];
                return {
                  productName: product.name,
                  variantName: variant?.name ?? null,
                  quantity: 1,
                  productImageUrl: variant?.imageUrl ?? product.imageUrl,
                  productInfo:
                    variant?.metaDescription?.trim() ||
                    product.metaDescription?.trim() ||
                    variant?.shortDescription?.trim() ||
                    product.shortDescription?.trim() ||
                    "Produktinformation visas här när den finns importerad från WooCommerce.",
                };
              })
            : [
                {
                  productName: "Exempelprodukt",
                  variantName: "1 st",
                  quantity: 1,
                  productImageUrl:
                    "https://dummyimage.com/640x420/1a4d5c/ffffff.jpg?text=Produktbild",
                  productInfo:
                    "Här visas produktens metabeskrivning, korta beskrivning eller annan produktinformation.",
                },
              ],
      },
      smtpConfig,
    );

    return NextResponse.json({
      message: `Förhandsvisning skickades till ${parsed.data.recipient}`,
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
