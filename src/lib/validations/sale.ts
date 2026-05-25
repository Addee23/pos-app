import { z } from "zod";

export const saleItemInputSchema = z.object({
  productId: z.string().min(1, "Produkt saknas"),
  variantId: z.string().min(1).nullable().optional(),
  quantity: z.coerce.number().int().min(1, "Antal måste vara minst 1"),
});

export const saleCreateSchema = z.object({
  items: z.array(saleItemInputSchema).min(1, "Kassan är tom"),
});

export type SaleCreateInput = z.infer<typeof saleCreateSchema>;
