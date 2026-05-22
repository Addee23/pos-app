"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/generated/prisma/client";
import { getNavItems, type NavItem } from "@/components/layout/navItems";

type AppNavProps = {
  role: Role;
  variant: "desktop" | "mobile";
};

export function AppNav({ role, variant }: AppNavProps) {
  const pathname = usePathname();
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
      {moreOpen ? (
        <div
          id="mobile-more-menu"
          className="mx-auto mb-2 max-w-xl rounded-lg border border-zinc-200 bg-white p-3 shadow-lg"
        >
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Fler sidor
          </p>
          <ul className="mt-2 grid grid-cols-1 gap-1">
            {moreMobileItems.map((item) => (
              <li key={item.href} className="min-w-0">
                <MobileNavLink
                  item={item}
                  label={item.label}
                  active={isActive(pathname, item.href)}
                  onClick={() => setMoreOpen(false)}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul
        className="mx-auto grid max-w-xl gap-1"
        style={{
          gridTemplateColumns: mobileColumns,
        }}
      >
        {mobileItems.map((item) => {
          if (item.href === "#more") {
            const moreActive = moreMobileItems.some((moreItem) =>
              isActive(pathname, moreItem.href),
            );

            return (
              <li key={item.href} className="min-w-0">
                <button
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  aria-expanded={moreOpen}
                  aria-controls="mobile-more-menu"
                  onClick={() => setMoreOpen((open) => !open)}
                  className={`flex min-h-11 w-full min-w-0 cursor-pointer items-center justify-center rounded-lg px-1 text-center text-[10px] font-semibold leading-tight transition min-[380px]:text-[11px] ${
                    moreOpen || moreActive
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
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
              <MobileNavLink item={item} active={active} />
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
}: {
  item: NavItem;
  label?: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      title={item.label}
      aria-label={item.label}
      onClick={onClick}
      className={`flex min-h-11 min-w-0 cursor-pointer items-center justify-center rounded-lg px-1 text-center text-[10px] font-semibold leading-tight transition min-[380px]:text-[11px] ${
        active
          ? "bg-zinc-900 text-white"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      <span className="block max-w-full truncate">{label}</span>
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
