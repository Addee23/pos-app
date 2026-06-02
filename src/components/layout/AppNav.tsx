"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import type { Role } from "@/generated/prisma/client";
import {
  getAdminMenuNavItems,
  getAdminPrimaryNavItems,
  getNavItems,
  type NavItem,
} from "@/components/layout/navItems";
import { useStartNavigation } from "@/components/layout/NavigationProgress";

type AppNavProps = {
  role: Role;
  variant: "desktop" | "mobile";
};

export function AppNav({ role, variant }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const startNavigation = useStartNavigation();
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const items = getNavItems(role);
  const primaryMobileItems =
    role === "ADMIN" ? getAdminPrimaryNavItems() : items;
  const menuMobileItems = role === "ADMIN" ? getAdminMenuNavItems() : [];
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

  useEffect(() => {
    setMenuOpen(false);
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    for (const menuItem of getAdminMenuNavItems()) {
      router.prefetch(menuItem.href);
    }
  }, [menuOpen, router]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [menuOpen]);

  function prepareNavigation(href: string) {
    router.prefetch(href);
    setPendingHref(href);
    startNavigation();
  }

  if (variant === "desktop") {
    return (
      <nav aria-label="Huvudnavigation" className="flex flex-1 flex-col px-3 py-4">
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch
                  onMouseEnter={() => router.prefetch(item.href)}
                  onTouchStart={() => prepareNavigation(item.href)}
                  onClick={() => prepareNavigation(item.href)}
                  className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition ${
                    pendingHref === item.href ? "opacity-70" : ""
                  } ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                      active
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <>
      {menuOpen ? (
        <button
          type="button"
          aria-label="Stäng mer-menyn"
          className="fixed inset-0 z-[60] bg-zinc-950/25 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      {menuOpen && menuMobileItems.length > 0 ? (
        <div
          id={menuId}
          className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-1/2 z-[70] w-[min(100%-2rem,16rem)] -translate-x-1/2 lg:hidden"
        >
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xl shadow-zinc-900/15">
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
                    pending={pendingHref === menuItem.href}
                    horizontal
                    onNavigate={() => prepareNavigation(menuItem.href)}
                    onClick={() => setMenuOpen(false)}
                    onMouseEnter={() => router.prefetch(menuItem.href)}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <nav
        aria-label="Huvudnavigation"
        className="fixed bottom-0 left-1/2 z-[80] w-full max-w-[430px] -translate-x-1/2 px-4 pb-[calc(0.7rem+env(safe-area-inset-bottom))] lg:hidden"
      >
        <ul
          className="mx-auto grid overflow-visible rounded-[1.65rem] border border-zinc-200 bg-white/95 p-2 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur"
          style={{ gridTemplateColumns: mobileColumns }}
        >
          {mobileItems.map((item) => {
            if (item.href === "#menu") {
              return (
                <li key={item.href} className="relative min-w-0">
                  <button
                    type="button"
                    title={item.label}
                    aria-label={item.label}
                    aria-expanded={menuOpen}
                    aria-controls={menuId}
                    onClick={() => {
                      for (const menuItem of menuMobileItems) {
                        router.prefetch(menuItem.href);
                      }
                      setMenuOpen((open) => !open);
                    }}
                    onTouchStart={() => {
                      for (const menuItem of menuMobileItems) {
                        router.prefetch(menuItem.href);
                      }
                    }}
                    className={`flex min-h-12 w-full min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 text-center text-[9px] font-bold leading-[1.15] transition min-[380px]:gap-1 min-[380px]:text-[10px] ${
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
                    <span className="block max-w-full whitespace-normal px-0.5 text-center leading-[1.15]">
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
                  pending={pendingHref === item.href}
                  onNavigate={() => prepareNavigation(item.href)}
                  onMouseEnter={() => router.prefetch(item.href)}
                />
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function MobileNavLink({
  item,
  label = item.shortLabel,
  active,
  pending = false,
  horizontal = false,
  onNavigate,
  onClick,
  onMouseEnter,
}: {
  item: NavItem;
  label?: string;
  active: boolean;
  pending?: boolean;
  horizontal?: boolean;
  onNavigate?: () => void;
  onClick?: () => void;
  onMouseEnter?: () => void;
}) {
  return (
    <Link
      href={item.href}
      prefetch
      title={item.label}
      aria-label={item.label}
      onTouchStart={onNavigate}
      onClick={() => {
        onNavigate?.();
        onClick?.();
      }}
      onMouseEnter={onMouseEnter}
      className={`flex min-w-0 cursor-pointer rounded-2xl px-0.5 text-[9px] font-bold leading-[1.15] transition min-[380px]:px-1 min-[380px]:text-[10px] ${
        horizontal
          ? "min-h-11 flex-row items-center gap-3 px-3 text-left text-sm"
          : "min-h-12 flex-col items-center justify-center gap-0.5 text-center min-[380px]:gap-1"
      } ${pending ? "opacity-70" : ""} ${
        active
          ? "text-blue-600"
          : "text-zinc-400 hover:text-blue-600"
      }`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-full text-base leading-none transition ${
          horizontal ? "size-8 rounded-xl text-xs" : "size-7"
        } ${active ? "bg-blue-50" : horizontal ? "bg-zinc-100" : "bg-transparent"}`}
      >
        {item.icon}
      </span>
      <span
        className={
          horizontal
            ? "truncate"
            : "block max-w-full whitespace-normal px-0.5 text-center leading-[1.15]"
        }
      >
        {label}
      </span>
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
