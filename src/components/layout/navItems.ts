import type { Role } from "@/generated/prisma/client";

export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: string;
};

const personalNav: NavItem[] = [
  { href: "/kassa", label: "Kassa", shortLabel: "Kassa", icon: "K" },
  { href: "/sok", label: "S\u00f6k", shortLabel: "S\u00f6k", icon: "S" },
  {
    href: "/upphamtning",
    label: "Upph\u00e4mtning",
    shortLabel: "H\u00e4mta",
    icon: "H",
  },
];

const adminNav: NavItem[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    shortLabel: "Dashboard",
    icon: "D",
  },
  { href: "/kassa", label: "Kassa", shortLabel: "Kassa", icon: "K" },
  {
    href: "/admin/products",
    label: "Produkter",
    shortLabel: "Produkter",
    icon: "P",
  },
  { href: "/sok", label: "S\u00f6k", shortLabel: "S\u00f6k", icon: "S" },
  {
    href: "/upphamtning",
    label: "Upph\u00e4mtning",
    shortLabel: "H\u00e4mta",
    icon: "H",
  },
  { href: "/admin/logs", label: "Logs", shortLabel: "Logs", icon: "L" },
  { href: "/admin/settings", label: "Settings", shortLabel: "Settings", icon: "I" },
];

export function getNavItems(role: Role): NavItem[] {
  return role === "ADMIN" ? adminNav : personalNav;
}
