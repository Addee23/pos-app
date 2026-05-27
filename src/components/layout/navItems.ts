import type { Role } from "@/generated/prisma/client";

export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: string;
};

/** Antal admin-flikar i bottenmenyn (PDF: Dashboard–Upphämtning). Resten i Mer. */
export const ADMIN_PRIMARY_NAV_COUNT = 5;

const personalNav: NavItem[] = [
  { href: "/kassa", label: "Kassa", shortLabel: "Kassa", icon: "K" },
  { href: "/sok", label: "Sök", shortLabel: "Sök", icon: "S" },
  {
    href: "/upphamtning",
    label: "Upphämtning",
    shortLabel: "Hämta",
    icon: "H",
  },
];

/** Ordning enligt projekt-PDF. */
const adminNav: NavItem[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    shortLabel: "Dash",
    icon: "D",
  },
  { href: "/kassa", label: "Kassa", shortLabel: "Kassa", icon: "K" },
  {
    href: "/admin/products",
    label: "Produkter",
    shortLabel: "Prod",
    icon: "P",
  },
  { href: "/sok", label: "Sök", shortLabel: "Sök", icon: "S" },
  {
    href: "/upphamtning",
    label: "Upphämtning",
    shortLabel: "Hämta",
    icon: "H",
  },
  {
    href: "/admin/logs",
    label: "Loggar",
    shortLabel: "Loggar",
    icon: "L",
  },
  {
    href: "/admin/users",
    label: "Användare",
    shortLabel: "Anv.",
    icon: "A",
  },
  {
    href: "/admin/settings",
    label: "Inställningar",
    shortLabel: "Inst.",
    icon: "I",
  },
];

export function getNavItems(role: Role): NavItem[] {
  return role === "ADMIN" ? adminNav : personalNav;
}

export function getAdminPrimaryNavItems(): NavItem[] {
  return adminNav.slice(0, ADMIN_PRIMARY_NAV_COUNT);
}

export function getAdminMenuNavItems(): NavItem[] {
  return adminNav.slice(ADMIN_PRIMARY_NAV_COUNT);
}
