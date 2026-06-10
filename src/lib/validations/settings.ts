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

/** Publik bild-URL eller lokal sökväg under /public (t.ex. /min-butik.png). */
const optionalLogoUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" ? null : value ?? null))
  .refine(
    (value) => {
      if (value === null) return true;
      if (value.startsWith("/")) return true;
      return z.string().url().safeParse(value).success;
    },
    {
      message:
        "Måste vara en giltig URL (https://…) eller lokal sökväg (t.ex. /min-butik.png)",
    },
  );

const optionalSecret = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" ? undefined : value));

export const storeSettingsSchema = z.object({
  name: z.string().trim().min(1, "Butiksnamn krävs"),
  logoUrl: optionalLogoUrl,
  wooUrl: optionalUrl,
  wooConsumerKey: optionalSecret,
  wooConsumerSecret: optionalSecret,
  wooWebhookSecret: optionalSecret,
  smtpHost: optionalText,
  smtpPort: z.coerce.number().int().min(1).max(65535).optional().nullable(),
  smtpSecure: z.coerce.boolean().default(false),
  smtpUser: optionalSecret,
  smtpPass: optionalSecret,
  smtpFrom: optionalText.refine(
    (value) => value === null || value.includes("@"),
    { message: "Måste innehålla en e-postadress" },
  ),
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

export const testEmailSchema = z.object({
  recipient: z.string().trim().email("Ange en giltig e-postadress"),
});
