import { z } from "zod";

export const userCreateSchema = z.object({
  email: z.string().trim().email("Ange en giltig e-postadress"),
  name: z.string().trim().min(2, "Namnet måste vara minst 2 tecken"),
  password: z.string().min(6, "Lösenordet måste vara minst 6 tecken"),
  role: z.enum(["ADMIN", "PERSONAL"]),
  storeId: z.string().min(1, "Butik saknas"),
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2, "Namnet måste vara minst 2 tecken"),
  role: z.enum(["ADMIN", "PERSONAL"]),
  storeId: z.string().min(1, "Butik saknas"),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
