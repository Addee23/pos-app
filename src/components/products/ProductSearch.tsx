"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import type { ProductFilterOptions } from "@/lib/product-filters";

type StoreOption = {
  id: string;
  name: string;
};

type ProductSearchProps = {
  stores: StoreOption[];
  filterOptions: ProductFilterOptions;
  initialQuery?: string;
  initialStoreId?: string;
  initialCategory?: string;
  initialBrand?: string;
  initialCountry?: string;
};

type ActiveFilter = {
  key: string;
  value: string;
  label: string;
};

export function ProductSearch({
  stores,
  filterOptions,
  initialQuery = "",
  initialStoreId = "",
  initialCategory = "",
  initialBrand = "",
  initialCountry = "",
}: ProductSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [queryState, setQueryState] = useState({
    initialQuery,
    value: initialQuery,
  });
  const [filtersOpen, setFiltersOpen] = useState(
    Boolean(initialBrand || initialCountry || initialStoreId),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const query =
    queryState.initialQuery === initialQuery ? queryState.value : initialQuery;

  function setQuery(value: string) {
    setQueryState({ initialQuery, value });
  }

  const activeFilters = buildActiveFilters({
    brand: initialBrand,
    storeId: initialStoreId,
    stores,
  });

  const secondaryFilterCount = [initialBrand, initialStoreId].filter(Boolean).length;

  const hasAnyFilter = Boolean(
    initialQuery || initialCategory || initialBrand || initialCountry || initialStoreId,
  );

  function navigate(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    params.delete("page");

    startTransition(() => {
      const queryString = params.toString();
      router.push(queryString ? `/admin/products?${queryString}` : "/admin/products");
    });
  }

  function toggleCategory(category: string) {
    navigate({
      category: initialCategory === category ? null : category,
    });
  }

  function toggleCountry(country: string) {
    navigate({
      country: initialCountry === country ? null : country,
    });
  }

  function handleSearch() {
    const trimmed = query.trim();
    if (trimmed === initialQuery) {
      return;
    }

    navigate({ q: trimmed || null });
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearch();
    }

    if (event.key === "Escape") {
      setQuery("");
      inputRef.current?.blur();
      if (initialQuery) {
        navigate({ q: null });
      }
    }
  }

  function clearAll() {
    setQuery("");
    setFiltersOpen(false);
    startTransition(() => {
      router.push("/admin/products");
    });
  }

  return (
    <section className="relative sticky top-[73px] z-30 space-y-2.5 rounded-2xl border border-zinc-200/70 bg-white/90 p-2.5 shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-2">
        <label className="group relative min-w-0 flex-1">
          <span className="sr-only">Sök produkter</span>
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 transition group-focus-within:text-zinc-600">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Sök produkter…"
            className="h-10 w-full rounded-xl bg-zinc-100/80 py-2 pl-10 pr-9 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200/80"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                if (initialQuery) {
                  navigate({ q: null });
                }
              }}
              aria-label="Rensa sökning"
              className="absolute right-2.5 top-1/2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-200/60 hover:text-zinc-600"
            >
              <CloseIcon />
            </button>
          ) : null}
        </label>

        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          aria-label="Visa fler filter"
          className={`relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl transition ${
            filtersOpen || secondaryFilterCount > 0
              ? "bg-zinc-900 text-white"
              : "bg-zinc-100/80 text-zinc-500 hover:bg-zinc-200/80 hover:text-zinc-700"
          }`}
        >
          <SlidersIcon />
          {secondaryFilterCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
              {secondaryFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      {filterOptions.categories.length > 0 ? (
        <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filterOptions.categories.map((category) => {
            const selected = initialCategory === category;

            return (
              <FilterChip
                key={category}
                label={category}
                selected={selected}
                pending={pending}
                onClick={() => toggleCategory(category)}
              />
            );
          })}
        </div>
      ) : null}

      {filterOptions.countries.length > 0 ? (
        <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filterOptions.countries.map((country) => {
            const selected = initialCountry === country;

            return (
              <FilterChip
                key={country}
                label={country}
                selected={selected}
                pending={pending}
                onClick={() => toggleCountry(country)}
                muted
              />
            );
          })}
        </div>
      ) : null}

      {filtersOpen ? (
        <div className="grid grid-cols-1 gap-2 border-t border-zinc-100 pt-2.5 sm:grid-cols-2">
          <CompactSelect
            label="Varumärke"
            value={initialBrand}
            onChange={(value) => navigate({ brand: value || null })}
            options={filterOptions.brands}
          />
          <CompactSelect
            label="Butik"
            value={initialStoreId}
            onChange={(value) => navigate({ storeId: value || null })}
            options={stores.map((store) => store.name)}
            optionValues={stores.map((store) => store.id)}
            emptyLabel="Alla butiker"
          />
        </div>
      ) : null}

      {hasAnyFilter ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-2">
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              disabled={pending}
              onClick={() => navigate({ [filter.key]: null })}
              className="inline-flex max-w-full cursor-pointer items-center gap-1 rounded-full bg-zinc-100/90 py-1 pl-2.5 pr-1.5 text-[11px] font-medium text-zinc-600 transition hover:bg-zinc-200/80 disabled:opacity-60"
            >
              <span className="truncate">{filter.label}</span>
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-white/80 text-zinc-400">
                <CloseIcon />
              </span>
            </button>
          ))}

          <button
            type="button"
            disabled={pending}
            onClick={clearAll}
            className="cursor-pointer px-1.5 text-[11px] font-medium text-zinc-400 transition hover:text-zinc-600 disabled:opacity-60"
          >
            Rensa allt
          </button>
        </div>
      ) : null}

      {pending ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden rounded-b-2xl">
          <div className="h-full w-1/3 animate-pulse bg-zinc-300" />
        </div>
      ) : null}
    </section>
  );
}

function CompactSelect({
  label,
  value,
  onChange,
  options,
  optionValues,
  emptyLabel = "Alla",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  optionValues?: string[];
  emptyLabel?: string;
}) {
  if (options.length === 0 && !value) {
    return null;
  }

  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="px-0.5 text-[10px] font-medium text-zinc-400">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full min-w-0 cursor-pointer appearance-none rounded-lg bg-zinc-100/80 py-1.5 pl-2.5 pr-8 text-xs font-medium text-zinc-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-zinc-200/80"
        >
          <option value="">{emptyLabel}</option>
          {options.map((option, index) => (
            <option
              key={optionValues?.[index] ?? option}
              value={optionValues?.[index] ?? option}
            >
              {option}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
          <ChevronDownIcon />
        </span>
      </div>
    </label>
  );
}

function buildActiveFilters({
  brand,
  storeId,
  stores,
}: {
  brand: string;
  storeId: string;
  stores: StoreOption[];
}): ActiveFilter[] {
  const filters: ActiveFilter[] = [];

  if (brand) {
    filters.push({ key: "brand", value: brand, label: brand });
  }

  if (storeId) {
    const storeName = stores.find((store) => store.id === storeId)?.name ?? "Butik";
    filters.push({ key: "storeId", value: storeId, label: storeName });
  }

  return filters;
}

function FilterChip({
  label,
  selected,
  pending,
  onClick,
  muted = false,
}: {
  label: string;
  selected: boolean;
  pending: boolean;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
        selected
          ? muted
            ? "bg-blue-600 text-white shadow-sm"
            : "bg-zinc-900 text-white shadow-sm"
          : "bg-zinc-100/90 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-800"
      }`}
    >
      {label}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6h16" />
      <path d="M8 12h8" />
      <path d="M10 18h4" />
      <circle cx="7" cy="6" r="2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="11" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      className="size-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="size-2.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
