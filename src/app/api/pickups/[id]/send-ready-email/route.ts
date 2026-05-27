import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { notifyPickupReady } from "@/lib/pickup-notifications";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json(
      { error: "Endast admin kan skicka bekräftelsemail" },
      { status: 403 },
    );
  }

  const emailLimit = rateLimit({
    key: `pickup-email:${session.user.id}`,
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (!emailLimit.allowed) {
    return tooManyRequests(emailLimit.retryAfterSeconds);
  }

  const { id } = await params;
  let force = false;

  try {
    const body = (await request.json()) as { force?: boolean };
    force = body.force === true;
  } catch {
    force = false;
  }

  const pickup = await prisma.pickup.findFirst({
    where: {
      id,
      ...(session.user.storeId ? { storeId: session.user.storeId } : {}),
    },
    select: { id: true },
  });

  if (!pickup) {
    return NextResponse.json(
      { error: "Upphämtningen hittades inte" },
      { status: 404 },
    );
  }

  const result = await notifyPickupReady(pickup.id, { force });

  if (result.status === "error") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  if (result.status === "skipped") {
    return NextResponse.json({ message: result.reason }, { status: 409 });
  }

  const updatedPickup = await prisma.pickup.findUnique({
    where: { id: pickup.id },
    include: {
      pickedUpBy: { select: { name: true, email: true } },
      cancelledBy: { select: { name: true, email: true } },
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          productName: true,
          variantName: true,
          productSlug: true,
          productImageUrl: true,
          quantity: true,
        },
      },
    },
  });

  return NextResponse.json({
    message: "Bekräftelsemail skickat",
    pickup: updatedPickup,
    readyEmailSentAt: result.readyEmailSentAt.toISOString(),
  });
}

function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      error: `För många försök. Vänta ${retryAfterSeconds} sekunder och försök igen.`,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}
