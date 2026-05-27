import { z } from "zod";

export const productMetaUpdateSchema = z.object({
  shortDescription: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? null : value ?? null)),
  metaDescription: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? null : value ?? null)),
});

export const productMetaBatchSaveSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        shortDescription: z
          .string()
          .trim()
          .nullable()
          .optional()
          .transform((value) => value ?? null),
        metaDescription: z
          .string()
          .trim()
          .nullable()
          .optional()
          .transform((value) => value ?? null),
      }),
    )
    .min(1)
    .max(10),
});
