import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { markPickupAsPacked } from "@/lib/pickup-notifications";
import { pickupResponseInclude } from "@/lib/pickup-serialize";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!session.user.storeId) {
    return NextResponse.json(
      { error: "Användaren saknar butik" },
      { status: 400 },
    );
  }

  const packLimit = rateLimit({
    key: `pickup-pack:${session.user.id}`,
    limit: 30,
    windowMs: 60 * 1000,
  });

  if (!packLimit.allowed) {
    return tooManyRequests(packLimit.retryAfterSeconds);
  }

  const { id } = await params;

  const pickup = await prisma.pickup.findFirst({
    where: {
      id,
      storeId: session.user.storeId,
    },
    select: { id: true },
  });

  if (!pickup) {
    return NextResponse.json(
      { error: "Upphämtningen hittades inte" },
      { status: 404 },
    );
  }

  const result = await markPickupAsPacked(pickup.id, session.user.id);

  if (result.status === "error") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  if (result.status === "skipped") {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }

  const updatedPickup = await prisma.pickup.findUnique({
    where: { id: pickup.id },
    include: pickupResponseInclude,
  });

  return NextResponse.json({
    message: result.readyEmailSentAt
      ? "Ordern är packad och kunden har fått mail"
      : "Ordern är packad (kundmail saknas)",
    pickup: updatedPickup,
    readyEmailSentAt: result.readyEmailSentAt?.toISOString() ?? null,
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
