import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { pickupResponseInclude, serializePickup } from "@/lib/pickup-serialize";
import { PlocklistaPrintClient } from "./PlocklistaPrintClient";

type Props = {
  searchParams: Promise<{ id?: string }>;
};

export default async function PlocklistaPrintPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await searchParams;
  if (!id) notFound();

  const ids = id.split(",").filter(Boolean);

  const pickups = await prisma.pickup.findMany({
    where: { id: { in: ids } },
    include: pickupResponseInclude,
  });

  if (pickups.length === 0) notFound();

  return <PlocklistaPrintClient pickups={pickups.map(serializePickup)} />;
}
