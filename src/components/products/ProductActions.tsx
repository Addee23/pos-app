"use client";

import Link from "next/link";
import { useToast } from "@/components/ui/ToastProvider";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ProductActionsProps = {
  productId: string;
  productName: string;
  showEditLink?: boolean;
};

export function ProductActions({
  productId,
  productName,
  showEditLink = true,
}: ProductActionsProps) {
  const router = useRouter();
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Ta bort "${productName}"?\n\nProdukten försvinner från katalogen. Historik i försäljning och upphämtning behålls utan koppling till produkten.`,
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        toast.error(data.error ?? "Kunde inte ta bort produkten");
        return;
      }

      router.push("/admin/products");
      router.refresh();
    } catch {
      toast.error("Något gick fel. Försök igen.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {showEditLink ? (
          <Link
            href={`/admin/products/${productId}`}
            className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100 sm:flex-none sm:min-w-[7.5rem]"
          >
            Redigera
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={deleting}
          className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-800 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:min-w-[7.5rem]"
        >
          {deleting ? "Tar bort..." : "Ta bort"}
        </button>
      </div>
    </div>
  );
}
