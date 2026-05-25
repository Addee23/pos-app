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

export function AppNav({ role, variant }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = getNavItems(role);
  const primaryMobileItems = role === "ADMIN" ? items.slice(0, 4) : items;
  const moreMobileItems = role === "ADMIN" ? items.slice(4) : [];
  const mobileItems =
    role === "ADMIN"
      ? [
          ...primaryMobileItems,
          { href: "#more", label: "Mer", shortLabel: "Mer" },
        ]
      : primaryMobileItems;
  const mobileColumns = `repeat(${mobileItems.length}, minmax(0, 1fr))`;

  useEffect(() => {
    for (const item of items) {
      router.prefetch(item.href);
    }
  }, [items, router]);

  if (variant === "desktop") {
    return (
      <nav aria-label="Huvudnavigation" className="hidden md:block">
        <ul className="flex flex-wrap items-center gap-1.5 rounded-lg bg-zinc-100/80 p-1">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch
                  onMouseEnter={() => router.prefetch(item.href)}
                  className={`inline-flex min-h-9 cursor-pointer items-center rounded-md px-3 text-sm font-semibold transition ${
                    active
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-zinc-600 hover:bg-white/70 hover:text-blue-700"
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
        className="mx-auto grid max-w-xl gap-1"
        style={{
          gridTemplateColumns: mobileColumns,
        }}
      >
        {mobileItems.map((item) => {
          if (item.href === "#more") {
            return (
              <li
                key={item.href}
                className="relative min-w-0"
                onMouseLeave={() => setMoreOpen(false)}
              >
                {moreOpen ? (
                  <div
                    id="mobile-more-menu"
                    className="absolute bottom-full right-0 w-52 pb-2"
                  >
                    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-xl shadow-zinc-900/10">
                      <p className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Fler sidor
                      </p>
                      <ul className="mt-2 grid grid-cols-1 gap-1">
                        {moreMobileItems.map((moreItem) => (
                          <li key={moreItem.href} className="min-w-0">
                            <MobileNavLink
                              item={moreItem}
                              label={moreItem.label}
                              active={isActive(pathname, moreItem.href)}
                              onClick={() => setMoreOpen(false)}
                              onMouseEnter={() => router.prefetch(moreItem.href)}
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
                  aria-expanded={moreOpen}
                  aria-controls="mobile-more-menu"
                  onClick={() => setMoreOpen((open) => !open)}
                  onMouseEnter={() => {
                    for (const moreItem of moreMobileItems) {
                      router.prefetch(moreItem.href);
                    }
                  }}
                  className={`flex min-h-11 w-full min-w-0 cursor-pointer items-center justify-center rounded-lg px-1 text-center text-[10px] font-semibold leading-tight transition min-[380px]:text-[11px] ${
                    moreOpen
                      ? "bg-accent text-accent-foreground shadow-sm shadow-blue-200"
                      : "text-zinc-500 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
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
                active={!moreOpen && active}
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
      className={`flex min-h-11 min-w-0 cursor-pointer items-center justify-center rounded-lg px-1 text-center text-[10px] font-semibold leading-tight transition min-[380px]:text-[11px] ${
        active
          ? "bg-accent text-accent-foreground shadow-sm shadow-blue-200"
          : "text-zinc-500 hover:bg-blue-50 hover:text-blue-700"
      }`}
    >
      <span className="block max-w-full truncate">{label}</span>
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
