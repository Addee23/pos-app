import { z } from "zod";
import { META_BATCH_GROUP_BY } from "@/lib/meta-batch";

const nullableMetaField = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((value) => value ?? null);

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
  groupBy: z.enum(META_BATCH_GROUP_BY),
  rows: z
    .array(
      z.object({
        key: z.string(),
        shortDescription: nullableMetaField,
        metaDescription: nullableMetaField,
      }),
    )
    .min(1)
    .max(100),
});
