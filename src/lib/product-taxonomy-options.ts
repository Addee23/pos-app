/** Standardiserade värden för POS-filter och Woo-import. */

export const PRODUCT_CATEGORIES = [
  "Cigarrer",
  "Tobak",
  "Tillbehör",
] as const;

export const PRODUCT_COUNTRIES = [
  "Kuba",
  "Nicaragua",
  "Dominikanska republiken",
  "Honduras",
  "Mexiko",
  "Ecuador",
  "Jamaica",
  "USA",
] as const;

export const PRODUCT_BRANDS = [
  "Chateau Diadem",
  "Perdomo",
  "Drew Estate",
  "Oliva",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ProductCountry = (typeof PRODUCT_COUNTRIES)[number];

/** Varumärke → ursprungsland när Woo saknar land-attribut. */
const BRAND_DEFAULT_COUNTRY: Record<string, ProductCountry> = {
  "Chateau Diadem": "Dominikanska republiken",
  Perdomo: "Nicaragua",
  "Drew Estate": "Nicaragua",
  Oliva: "Nicaragua",
};

const COUNTRY_ALIASES: Record<string, ProductCountry> = {
  kuba: "Kuba",
  cuba: "Kuba",
  cuban: "Kuba",
  nicaragua: "Nicaragua",
  nicaraguan: "Nicaragua",
  honduras: "Honduras",
  mexiko: "Mexiko",
  mexico: "Mexiko",
  ecuador: "Ecuador",
  jamaica: "Jamaica",
  usa: "USA",
  "united states": "USA",
  dominikanska: "Dominikanska republiken",
  "dominikanska republiken": "Dominikanska republiken",
  "dominican republic": "Dominikanska republiken",
  dominican: "Dominikanska republiken",
  dr: "Dominikanska republiken",
};

const BRAND_PATTERNS: Array<{ pattern: RegExp; brand: string }> = [
  { pattern: /chateau diadem/i, brand: "Chateau Diadem" },
  { pattern: /perdomo/i, brand: "Perdomo" },
  { pattern: /drew estate/i, brand: "Drew Estate" },
  { pattern: /flor de oliva/i, brand: "Oliva" },
];

export function normalizeCountry(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim();
  const canonical = PRODUCT_COUNTRIES.find(
    (country) => country.toLowerCase() === trimmed.toLowerCase(),
  );
  if (canonical) {
    return canonical;
  }

  const alias = COUNTRY_ALIASES[trimmed.toLowerCase()];
  return alias ?? trimmed;
}

export function normalizeCategory(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim();
  const canonical = PRODUCT_CATEGORIES.find(
    (category) => category.toLowerCase() === trimmed.toLowerCase(),
  );
  return canonical ?? trimmed;
}

export function normalizeBrand(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim();
  const canonical = PRODUCT_BRANDS.find(
    (brand) => brand.toLowerCase() === trimmed.toLowerCase(),
  );
  return canonical ?? trimmed;
}

export function inferProductTaxonomy(input: {
  name: string;
  shortDescription?: string | null;
  brand?: string | null;
}): {
  category: string | null;
  brand: string | null;
  country: string | null;
} {
  const text = `${input.name} ${input.shortDescription ?? ""}`.trim();
  const lower = text.toLowerCase();

  let category: string | null = null;
  if (
    /cigarr|cigar|corona|lancero|robusto|toro|churchill|panatela|half corona/i.test(
      text,
    )
  ) {
    category = "Cigarrer";
  } else if (/tobak|snus|pipa/i.test(text)) {
    category = "Tobak";
  } else if (/tändare|cutter|hygrometer|humidor|tillbehör|snoppare|giljotin/i.test(text)) {
    category = "Tillbehör";
  }

  let brand = normalizeBrand(input.brand);
  if (!brand) {
    for (const { pattern, brand: matchedBrand } of BRAND_PATTERNS) {
      if (pattern.test(text)) {
        brand = matchedBrand;
        break;
      }
    }
  }

  let country = inferCountryFromText(lower);
  if (!country && brand) {
    country = BRAND_DEFAULT_COUNTRY[brand] ?? null;
  }

  if (!category && brand && brand in BRAND_DEFAULT_COUNTRY) {
    category = "Cigarrer";
  }

  return { category, brand, country };
}

function inferCountryFromText(lower: string): string | null {
  for (const [alias, country] of Object.entries(COUNTRY_ALIASES)) {
    if (alias.length <= 3) {
      continue;
    }

    if (lower.includes(alias)) {
      return country;
    }
  }

  if (/\bdr\b/.test(lower)) {
    return "Dominikanska republiken";
  }

  return null;
}

export function countryFromBrand(brand: string | null | undefined): string | null {
  if (!brand) {
    return null;
  }

  return BRAND_DEFAULT_COUNTRY[brand] ?? null;
}

export function taxonomySelectOptions(
  canonical: readonly string[],
  currentValue?: string | null,
): string[] {
  const options = [...canonical];
  const normalized = currentValue?.trim();

  if (normalized && !options.some((o) => o.toLowerCase() === normalized.toLowerCase())) {
    options.push(normalized);
  }

  return options;
}
