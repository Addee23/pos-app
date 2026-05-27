type ProductMetaSource = {
  name: string;
  shortDescription?: string | null;
  category?: string | null;
  brand?: string | null;
  country?: string | null;
};

/** SEO-meta (Rank Math) + kundtext för mail/katalog. */
export function generateProductMeta(source: ProductMetaSource): {
  metaDescription: string;
  shortDescription: string;
} {
  const name = source.name.trim();
  const parts: string[] = [];

  if (source.brand) {
    parts.push(source.brand);
  }

  if (source.category) {
    parts.push(source.category);
  }

  if (source.country) {
    parts.push(source.country);
  }

  const context = parts.length > 0 ? ` – ${parts.join(", ")}` : "";
  const existingShort = source.shortDescription?.trim();

  const shortDescription =
    existingShort ||
    `Upptäck ${name}${context}. Handla enkelt och hämta i butik när ordern är klar.`;

  const seoBase = [name, source.brand, source.category].filter(Boolean).join(" | ");
  const metaDescription = `${seoBase}. ${shortDescription}`.replace(/\s+/g, " ").trim().slice(0, 155);

  return { metaDescription, shortDescription };
}
