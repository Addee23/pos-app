"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/generated/prisma/client";

type NavItem = {
  href: string;
  label: string;
};

const personalNav: NavItem[] = [
  { href: "/kassa", label: "Kassa" },
  { href: "/sok", label: "Sök" },
  { href: "/upphamtning", label: "Upphämtning" },
];

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/kassa", label: "Kassa" },
  { href: "/admin/products", label: "Produkter" },
  { href: "/sok", label: "Sök" },
  { href: "/upphamtning", label: "Upphämtning" },
];

type BottomNavProps = {
  role: Role;
};

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const items = role === "ADMIN" ? adminNav : personalNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur safe-area-pb">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex min-h-14 flex-col items-center justify-center px-1 text-xs font-medium transition ${
                  active ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                <span
                  className={`mb-0.5 h-1 w-6 rounded-full transition ${
                    active ? "bg-zinc-900" : "bg-transparent"
                  }`}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
