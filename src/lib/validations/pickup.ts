import { z } from "zod";

export const pickupSearchSchema = z.object({
  q: z.string().trim().max(80, "Sökningen är för lång").optional(),
});

export type PickupSearchInput = z.infer<typeof pickupSearchSchema>;
