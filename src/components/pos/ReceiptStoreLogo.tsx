"use client";

import { useState } from "react";
import { STORE_LOGO_PLACEHOLDER } from "@/lib/constants/branding";

type ReceiptStoreLogoProps = {
  logoUrl: string | null;
  storeName: string;
};

export function ReceiptStoreLogo({ logoUrl, storeName }: ReceiptStoreLogoProps) {
  const [failed, setFailed] = useState(false);
  const hasCustomLogo = Boolean(logoUrl?.trim());
  const src =
    !hasCustomLogo || failed ? STORE_LOGO_PLACEHOLDER : logoUrl!.trim();

  return (
    <img
      src={src}
      alt={hasCustomLogo && !failed ? `${storeName} logotyp` : "Butikslogotyp"}
      width={96}
      height={96}
      className="mx-auto mb-3 h-16 w-auto max-w-[45%] object-contain opacity-90"
      onError={() => {
        if (hasCustomLogo) {
          setFailed(true);
        }
      }}
    />
  );
}

export function resolveReceiptLogoUrl(logoUrl: string | null): string | null {
  const trimmed = logoUrl?.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  if (trimmed.includes("://")) {
    try {
      const url = new URL(trimmed);
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        return url.pathname || null;
      }
      return trimmed;
    } catch {
      return null;
    }
  }

  return `/${trimmed.replace(/^\/+/, "")}`;
}
