import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { saleCreateSchema } from "@/lib/validations/sale";
import { StockMovementType } from "@/generated/prisma/client";
import {
  hasWooCredentials,
  updateWooProductStock,
  updateWooVariantStock,
} from "@/lib/woocommerce-api";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  const checkoutLimit = rateLimit({
    key: `checkout:${session.user.id}`,
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (!checkoutLimit.allowed) {
    return tooManyRequests(checkoutLimit.retryAfterSeconds);
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const parsed = saleCreateSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltig data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!parsed.data.storeId) {
    return NextResponse.json({ error: "Ange storeId" }, { status: 400 });
  }
  const storeExists = await prisma.store.findUnique({
    where: { id: parsed.data.storeId },
    select: { id: true },
  });
  if (!storeExists) {
    return NextResponse.json({ error: "Butiken hittades inte" }, { status: 404 });
  }
  const storeId = parsed.data.storeId;

  type SaleLineItem = {
    productId: string;
    variantId?: string;
    wooProductId: number;
    wooVariantId?: number;
    productName: string;
    variantName?: string;
    ean?: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    quantityBefore: number;
    quantityAfter: number;
  };

  try {
    const { sale, items: saleLineItems } = await prisma.$transaction(async (tx) => {
      const preparedItems: SaleLineItem[] = [];

      for (const item of parsed.data.items) {
        if (item.variantId) {
          const variant = await tx.productVariant.findFirst({
            where: { id: item.variantId, productId: item.productId },
          });
          const product = await tx.product.findFirst({
            where: { id: item.productId, storeId },
          });

          if (!variant || !product) throw new Error("VARIANT_NOT_FOUND");
          if (variant.stockQuantity < item.quantity) {
            throw new Error(`OUT_OF_STOCK:${product.name} ${variant.name}`);
          }

          preparedItems.push({
            productId: variant.productId,
            variantId: variant.id,
            wooProductId: product.wooProductId,
            wooVariantId: variant.wooVariantId ?? undefined,
            productName: product.name,
            variantName: variant.name,
            ean: variant.ean,
            quantity: item.quantity,
            unitPrice: Number(variant.price),
            lineTotal: Number(variant.price) * item.quantity,
            quantityBefore: variant.stockQuantity,
            quantityAfter: variant.stockQuantity - item.quantity,
          });
          continue;
        }

        const product = await tx.product.findFirst({
          where: { id: item.productId, storeId, variants: { none: {} } },
        });

        if (!product) throw new Error("PRODUCT_NOT_FOUND");
        if (product.stockQuantity < item.quantity) {
          throw new Error(`OUT_OF_STOCK:${product.name}`);
        }

        preparedItems.push({
          productId: product.id,
          wooProductId: product.wooProductId,
          productName: product.name,
          ean: product.ean,
          quantity: item.quantity,
          unitPrice: Number(product.price),
          lineTotal: Number(product.price) * item.quantity,
          quantityBefore: product.stockQuantity,
          quantityAfter: product.stockQuantity - item.quantity,
        });
      }

      const total = preparedItems.reduce((sum, item) => sum + item.lineTotal, 0);

      const createdSale = await tx.sale.create({
        data: { storeId, userId: session.user.id, total },
      });

      for (const item of preparedItems) {
        const saleItem = await tx.saleItem.create({
          data: {
            saleId: createdSale.id,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            ean: item.ean,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          },
        });

        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: item.quantityAfter },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: item.quantityAfter },
          });
        }

        await tx.stockMovement.create({
          data: {
            storeId,
            productId: item.productId,
            variantId: item.variantId,
            saleItemId: saleItem.id,
            userId: session.user.id,
            type: StockMovementType.SALE,
            quantityChange: -item.quantity,
            quantityBefore: item.quantityBefore,
            quantityAfter: item.quantityAfter,
            reason: "POS-försäljning",
          },
        });
      }

      const completedSale = await tx.sale.findUniqueOrThrow({
        where: { id: createdSale.id },
        include: { items: true },
      });

      return { sale: completedSale, items: preparedItems };
    });

    void syncSaleStockToWoo(storeId, saleLineItems);

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error(error);

    if (error instanceof Error && error.message.startsWith("OUT_OF_STOCK:")) {
      const name = error.message.replace("OUT_OF_STOCK:", "");
      return NextResponse.json(
        { error: `${name} har inte tillräckligt lager` },
        { status: 409 },
      );
    }

    if (
      error instanceof Error &&
      ["PRODUCT_NOT_FOUND", "VARIANT_NOT_FOUND"].includes(error.message)
    ) {
      return NextResponse.json(
        { error: "Produkten hittades inte i din butik" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Kunde inte slutföra köpet" },
      { status: 500 },
    );
  }
}

async function syncSaleStockToWoo(
  storeId: string,
  items: Array<{ wooProductId: number; wooVariantId?: number; quantityAfter: number }>,
): Promise<void> {
  try {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { wooUrl: true, wooConsumerKey: true, wooConsumerSecret: true },
    });
    if (!store) {
      console.warn("[Woo stock sync] Butik hittades inte:", storeId);
      return;
    }
    if (!hasWooCredentials(store)) {
      console.warn("[Woo stock sync] WooCommerce ej konfigurerat för butik:", storeId);
      return;
    }
    console.log("[Woo stock sync] Startar sync för", items.length, "produkt(er)...");
    await Promise.all(
      items.map(async (item) => {
        try {
          if (item.wooVariantId) {
            await updateWooVariantStock(store, item.wooProductId, item.wooVariantId, item.quantityAfter);
            console.log(`[Woo stock sync] Variant ${item.wooVariantId} → ${item.quantityAfter} i lager`);
          } else {
            await updateWooProductStock(store, item.wooProductId, item.quantityAfter);
            console.log(`[Woo stock sync] Produkt ${item.wooProductId} → ${item.quantityAfter} i lager`);
          }
        } catch (itemErr) {
          console.error(`[Woo stock sync] Misslyckades för produkt ${item.wooProductId}:`, itemErr);
        }
      }),
    );
    console.log("[Woo stock sync] Klar.");
  } catch (err) {
    console.error("[Woo stock sync] Oväntat fel:", err);
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
    { error: `För många köp. Vänta ${retryAfterSeconds} sekunder och försök igen.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
