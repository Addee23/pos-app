"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Role } from "@/generated/prisma/client";
import { getNavItems, type NavItem } from "@/components/layout/navItems";

type AppNavProps = {
  role: Role;
  variant: "desktop" | "mobile";
};

const visibleAdminItems = 4;

export function AppNav({ role, variant }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = getNavItems(role);
  const primaryMobileItems =
    role === "ADMIN" ? items.slice(0, visibleAdminItems) : items;
  const menuMobileItems = role === "ADMIN" ? items.slice(visibleAdminItems) : [];
  const mobileItems =
    role === "ADMIN"
      ? [
          ...primaryMobileItems,
          { href: "#menu", label: "Mer", shortLabel: "Mer", icon: "\u2630" },
        ]
      : primaryMobileItems;
  const mobileColumns = `repeat(${mobileItems.length}, minmax(0, 1fr))`;

  useEffect(() => {
    for (const item of items) {
      router.prefetch(item.href);
    }
  }, [items, router]);

  if (variant === "desktop") {
    return null;
  }

  return (
    <nav
      aria-label="Huvudnavigation"
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 px-4 pb-[calc(0.7rem+env(safe-area-inset-bottom))]"
    >
      <ul
        className="mx-auto grid rounded-[1.65rem] border border-zinc-200 bg-white/95 p-2 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur"
        style={{ gridTemplateColumns: mobileColumns }}
      >
        {mobileItems.map((item) => {
          if (item.href === "#menu") {
            return (
              <li
                key={item.href}
                className="relative min-w-0"
                onMouseLeave={() => setMenuOpen(false)}
              >
                {menuOpen ? (
                  <div
                    id="mobile-menu"
                    className="absolute bottom-full right-0 w-52 pb-2"
                  >
                    <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl shadow-zinc-900/10">
                      <p className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Mer
                      </p>
                      <ul className="mt-2 grid grid-cols-1 gap-1">
                        {menuMobileItems.map((menuItem) => (
                          <li key={menuItem.href} className="min-w-0">
                            <MobileNavLink
                              item={menuItem}
                              label={menuItem.label}
                              active={isActive(pathname, menuItem.href)}
                              onClick={() => setMenuOpen(false)}
                              onMouseEnter={() => router.prefetch(menuItem.href)}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}
                <button
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  aria-expanded={menuOpen}
                  aria-controls="mobile-menu"
                  onClick={() => setMenuOpen((open) => !open)}
                  onMouseEnter={() => {
                    for (const menuItem of menuMobileItems) {
                      router.prefetch(menuItem.href);
                    }
                  }}
                  className={`flex min-h-12 w-full min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center text-[10px] font-bold leading-tight transition min-[380px]:text-[11px] ${
                    menuOpen
                      ? "text-blue-600"
                      : "text-zinc-400 hover:text-blue-600"
                  }`}
                >
                  <span
                    className={`flex size-7 items-center justify-center rounded-full text-base leading-none transition ${
                      menuOpen ? "bg-blue-50" : "bg-transparent"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="block max-w-full truncate">
                    {item.shortLabel}
                  </span>
                </button>
              </li>
            );
          }

          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="min-w-0">
              <MobileNavLink
                item={item}
                active={!menuOpen && active}
                onMouseEnter={() => router.prefetch(item.href)}
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MobileNavLink({
  item,
  label = item.shortLabel,
  active,
  onClick,
  onMouseEnter,
}: {
  item: NavItem;
  label?: string;
  active: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
}) {
  return (
    <Link
      href={item.href}
      prefetch
      title={item.label}
      aria-label={item.label}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`flex min-h-12 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center text-[10px] font-bold leading-tight transition min-[380px]:text-[11px] ${
        active
          ? "text-blue-600"
          : "text-zinc-400 hover:text-blue-600"
      }`}
    >
      <span
        className={`flex size-7 items-center justify-center rounded-full text-base leading-none transition ${
          active ? "bg-blue-50" : "bg-transparent"
        }`}
      >
        {item.icon}
      </span>
      <span className="block max-w-full truncate">{label}</span>
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
