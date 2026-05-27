import { z } from "zod";
import {
  normalizeBrand,
  normalizeCategory,
  normalizeCountry,
} from "@/lib/product-taxonomy-options";

const optionalLabelField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? null : v ?? null));

export const productUpdateSchema = z.object({
  price: z.coerce.number().min(0, "Pris kan inte vara negativt"),
  ean: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? null : v ?? null)),
  stockQuantity: z.coerce.number().int().min(0, "Lager kan inte vara negativt"),
  stockLocation: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? null : v ?? null)),
  category: optionalLabelField.transform(normalizeCategory),
  brand: optionalLabelField.transform(normalizeBrand),
  country: optionalLabelField.transform(normalizeCountry),
});

export const variantUpdateSchema = z.object({
  price: z.coerce.number().min(0, "Pris kan inte vara negativt"),
  ean: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? null : v ?? null)),
  stockQuantity: z.coerce.number().int().min(0, "Lager kan inte vara negativt"),
  stockLocation: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? null : v ?? null)),
});

export const productSearchSchema = z.object({
  q: z.string().trim().optional(),
  storeId: z.string().optional(),
  category: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  country: z.string().trim().optional(),
});

export const productCreateSchema = z.object({
  storeId: z.string().min(1, "Välj butik"),
  name: z.string().trim().min(1, "Namn krävs").max(200),
  price: z.coerce.number().min(0, "Pris kan inte vara negativt"),
  ean: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? null : v ?? null)),
  stockQuantity: z.coerce.number().int().min(0, "Lager kan inte vara negativt"),
  stockLocation: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? null : v ?? null)),
  shortDescription: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? null : v ?? null)),
  category: optionalLabelField.transform(normalizeCategory),
  brand: optionalLabelField.transform(normalizeBrand),
  country: optionalLabelField.transform(normalizeCountry),
});

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
