import type { Role } from "@/generated/prisma/client";

export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
};

const personalNav: NavItem[] = [
  { href: "/kassa", label: "Kassa", shortLabel: "Kassa" },
  { href: "/sok", label: "Sök", shortLabel: "Sök" },
  { href: "/upphamtning", label: "Upphämtning", shortLabel: "Hämta" },
];

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", shortLabel: "Start" },
  { href: "/kassa", label: "Kassa", shortLabel: "Kassa" },
  { href: "/admin/products", label: "Produkter", shortLabel: "Produkter" },
  { href: "/sok", label: "Sök", shortLabel: "Sök" },
  { href: "/upphamtning", label: "Upphämtning", shortLabel: "Hämta" },
  { href: "/admin/logs", label: "Logs", shortLabel: "Logs" },
  { href: "/admin/settings", label: "Settings", shortLabel: "Settings" },
];

export function getNavItems(role: Role): NavItem[] {
  return role === "ADMIN" ? adminNav : personalNav;
}
