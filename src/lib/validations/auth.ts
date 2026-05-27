import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Ange en giltig e-postadress"),
  password: z.string().min(6, "Lösenordet måste vara minst 6 tecken"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(6, "Nuvarande lösenord måste vara minst 6 tecken"),
    newPassword: z
      .string()
      .min(6, "Nytt lösenord måste vara minst 6 tecken"),
    confirmPassword: z
      .string()
      .min(6, "Bekräfta lösenordet med minst 6 tecken"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Lösenorden matchar inte",
    path: ["confirmPassword"],
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
