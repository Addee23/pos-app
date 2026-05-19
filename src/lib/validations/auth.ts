import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Ange en giltig e-postadress"),
  password: z.string().min(6, "Lösenordet måste vara minst 6 tecken"),
});

export type LoginInput = z.infer<typeof loginSchema>;
