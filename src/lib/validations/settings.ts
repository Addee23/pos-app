import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" ? null : value ?? null));

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" ? null : value ?? null))
  .refine(
    (value) => value === null || z.string().url().safeParse(value).success,
    { message: "Måste vara en giltig URL" },
  );

export const storeSettingsSchema = z.object({
  name: z.string().trim().min(1, "Butiksnamn krävs"),
  logoUrl: optionalUrl,
  wooUrl: optionalUrl,
  address: optionalText,
  receiptFooter: optionalText,
  returnText: optionalText,
  thankYouMessage: optionalText,
  socialLinks: optionalText,
  receiptWidthMm: z.coerce
    .number()
    .int()
    .min(58, "Minst 58 mm")
    .max(112, "Max 112 mm"),
});

export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;
