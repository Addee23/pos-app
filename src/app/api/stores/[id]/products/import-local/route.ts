import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "../../../../../../../rbac";
import { rateLimit } from "@/lib/rate-limit";
import { importWooProductsForStore } from "@/lib/product-import";
import { parseProductsFromJsonInput } from "@/lib/product-woo-json";
import { readFile } from "fs/promises";
import { resolve } from "path";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });

  const importLimit = rateLimit({ key: `import-local:${session.user.id}`, limit: 5, windowMs: 60_000 });
  if (!importLimit.allowed) return NextResponse.json({ error: "För många anrop." }, { status: 429 });

  const { id } = await context.params;

  const store = await prisma.store.findUnique({
    where: { id },
    select: { id: true, name: true, wooUrl: true, wooConsumerKey: true, wooConsumerSecret: true },
  });
  if (!store) return NextResponse.json({ error: "Butiken hittades inte" }, { status: 404 });

  try {
    const filePath = resolve(process.cwd(), "data/cigarr.json");
    const rawText = await readFile(filePath, "utf8");
    const parsed = JSON.parse(rawText) as unknown;
    const products = parseProductsFromJsonInput(parsed);

    if (!products) {
      return NextResponse.json({ error: "Ogiltig JSON i cigarr.json" }, { status: 500 });
    }

    const result = await importWooProductsForStore(prisma, store, products, {});

    return NextResponse.json({
      message: `Importerade ${result.importedProducts} produkter och ${result.importedVariants} varianter från cigarr.json.`,
      importedProducts: result.importedProducts,
      importedVariants: result.importedVariants,
    });
  } catch (error) {
    console.error("import-local failed", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Import misslyckades: ${detail}` }, { status: 500 });
  }
}
