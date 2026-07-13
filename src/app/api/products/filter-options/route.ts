import { auth } from "@/auth";
import { loadProductFilterOptions } from "@/lib/product-filters";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") ?? undefined;

  const options = await loadProductFilterOptions(storeId);
  return NextResponse.json(options);
}
