import { z } from "zod";

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
});

export const variantUpdateSchema = productUpdateSchema;

export const productSearchSchema = z.object({
  q: z.string().trim().optional(),
  storeId: z.string().optional(),
});

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
