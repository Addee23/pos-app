import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PickupStatus } from "@/generated/prisma/client";
import { isAdmin } from "@/lib/rbac";
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

  if (!isAdmin(session.user.role)) {
    return NextResponse.json(
      { error: "Endast admin kan avbryta upphämtningar" },
      { status: 403 },
    );
  }

  if (!isAdmin(session.user.role) && !session.user.storeId) {
    return NextResponse.json(
      { error: "Användaren saknar butik" },
      { status: 400 },
    );
  }

  const cancelLimit = rateLimit({
    key: `pickup-cancel:${session.user.id}`,
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (!cancelLimit.allowed) {
    return tooManyRequests(cancelLimit.retryAfterSeconds);
  }

  const { id } = await params;

  try {
    const pickup = await prisma.pickup.findFirst({
      where: {
        id,
        ...(isAdmin(session.user.role)
          ? {}
          : { storeId: session.user.storeId! }),
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
        { error: "En redan hämtad order kan inte avbrytas" },
        { status: 409 },
      );
    }

    if (pickup.status === PickupStatus.CANCELLED) {
      return NextResponse.json(
        { error: "Ordern är redan avbruten" },
        { status: 409 },
      );
    }

    const updatedPickup = await prisma.pickup.update({
      where: { id: pickup.id },
      data: {
        status: PickupStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledById: session.user.id,
      },
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

    return NextResponse.json(updatedPickup);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunde inte avbryta upphämtningen" },
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
