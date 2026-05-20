"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { getNavItems } from "@/components/layout/navItems";

type AppNavProps = {
  role: Role;
  variant: "desktop" | "mobile";
};

export function AppNav({ role, variant }: AppNavProps) {
  const pathname = usePathname();
  const items = getNavItems(role);
  const mobileColumns =
    role === "ADMIN"
      ? "0.8fr 0.85fr 0.85fr 0.65fr 0.8fr 1.7fr"
      : `repeat(${items.length}, minmax(0, 1fr))`;

  if (variant === "desktop") {
    return (
      <nav aria-label="Huvudnavigation" className="hidden md:block">
        <ul className="flex flex-wrap items-center gap-2">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`inline-flex min-h-10 cursor-pointer items-center rounded-lg px-3 text-sm font-medium transition ${
                    active
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Huvudnavigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden"
    >
      <ul
        className="mx-auto grid max-w-xl grid-rows-1 gap-1"
        style={{
          gridTemplateColumns: mobileColumns,
        }}
      >
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                title={item.label}
                aria-label={item.label}
                className={`flex min-h-12 min-w-0 cursor-pointer items-center justify-center rounded-lg px-1 text-center text-[10px] font-semibold leading-tight transition min-[380px]:text-[11px] ${
                  active
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <span className="block max-w-full truncate">
                  {item.shortLabel}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
