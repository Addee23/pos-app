import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  KassaClient,
  type PosProduct,
  type PosStore,
} from "@/components/pos/KassaClient";

export default async function KassaPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.storeId) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Kassa</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Användaren saknar butik och kan därför inte använda kassan.
        </p>
      </section>
    );
  }

  const [store, products] = await Promise.all([
    prisma.store.findUnique({
      where: { id: session.user.storeId },
      select: {
        id: true,
        name: true,
        address: true,
        receiptFooter: true,
        returnText: true,
        thankYouMessage: true,
        socialLinks: true,
        receiptWidthMm: true,
      },
    }),
    prisma.product.findMany({
      where: { storeId: session.user.storeId },
      include: { variants: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
      take: 50,
    }),
  ]);

  if (!store) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Kassa</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Butiken hittades inte och kassan kan därför inte öppnas.
        </p>
      </section>
    );
  }

  const serializedProducts: PosProduct[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    ean: product.ean,
    price: Number(product.price),
    stockQuantity: product.stockQuantity,
    stockLocation: product.stockLocation,
    productType: product.productType,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      ean: variant.ean,
      price: Number(variant.price),
      stockQuantity: variant.stockQuantity,
      stockLocation: variant.stockLocation,
    })),
  }));

  const serializedStore: PosStore = {
    id: store.id,
    name: store.name,
    address: store.address,
    receiptFooter: store.receiptFooter,
    returnText: store.returnText,
    thankYouMessage: store.thankYouMessage,
    socialLinks: store.socialLinks,
    receiptWidthMm: store.receiptWidthMm,
  };

  return <KassaClient products={serializedProducts} store={serializedStore} />;
}
