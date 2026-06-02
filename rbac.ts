import type { Role } from "@/generated/prisma/client";

export function isAdmin(role: Role): boolean {
  return role === "ADMIN";
}

export function isPersonal(role: Role): boolean {
  return role === "PERSONAL";
}

export const ADMIN_ROUTES = ["/admin"] as const;
export const PERSONAL_ROUTES = ["/kassa", "/sok", "/upphamtning"] as const;
