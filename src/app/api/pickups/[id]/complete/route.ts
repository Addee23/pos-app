import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PickupStatus } from "@/generated/prisma/client";
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

  const completeLimit = rateLimit({
    key: `pickup-complete:${session.user.id}`,
    limit: 30,
    windowMs: 60 * 1000,
  });

  if (!completeLimit.allowed) {
    return tooManyRequests(completeLimit.retryAfterSeconds);
  }

  const { id } = await params;

  try {
    const pickup = await prisma.pickup.findFirst({
      where: {
        id,
        storeId: session.user.storeId,
      },
    });

    if (!pickup) {
      return NextResponse.json(
        { error: "Upphämtningen hittades inte" },
        { status: 404 },
      );
    }

    if (pickup.status === PickupStatus.PICKED_UP) {
      return NextResponse.json(
        { error: "Upphämtningen är redan markerad som hämtad" },
        { status: 409 },
      );
    }

    const updatedPickup = await prisma.pickup.update({
      where: { id: pickup.id },
      data: {
        status: PickupStatus.PICKED_UP,
        pickedUpAt: new Date(),
        pickedUpById: session.user.id,
      },
      include: {
        pickedUpBy: { select: { name: true, email: true } },
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

    return NextResponse.json(updatedPickup);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunde inte markera upphämtningen som hämtad" },
      { status: 500 },
    );
  }
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
