"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { ProductFilterOptions } from "@/lib/product-filters";

type StoreOption = {
  id: string;
  name: string;
};

type DraftFilters = {
  category: string;
  brand: string;
  country: string;
  storeId: string;
};

type ProductSearchProps = {
  stores: StoreOption[];
  filterOptions: ProductFilterOptions;
  basePath?: string;
  showStoreFilter?: boolean;
  /** Sök-sidan: filter appliceras först vid klick på Sök. */
  submitOnButtonOnly?: boolean;
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
  basePath = "/admin/products",
  showStoreFilter = true,
  submitOnButtonOnly = false,
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
  const [draft, setDraft] = useState<DraftFilters>({
    category: initialCategory,
    brand: initialBrand,
    country: initialCountry,
    storeId: initialStoreId,
  });
  const [filtersOpen, setFiltersOpen] = useState(
    Boolean(initialBrand || initialCountry || initialStoreId || initialCategory),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const query =
    queryState.initialQuery === initialQuery ? queryState.value : initialQuery;

  useEffect(() => {
    setDraft({
      category: initialCategory,
      brand: initialBrand,
      country: initialCountry,
      storeId: initialStoreId,
    });
  }, [initialCategory, initialBrand, initialCountry, initialStoreId]);

  function setQuery(value: string) {
    setQueryState({ initialQuery, value });
  }

  const chipFilters = submitOnButtonOnly ? draft : appliedFilters();
  const activeFilters = buildActiveFilters({
    q: initialQuery,
    category: initialCategory,
    brand: initialBrand,
    country: initialCountry,
    storeId: initialStoreId,
    stores,
  });
  const draftFilterCount = submitOnButtonOnly
    ? countDraftFilters(draft, query, initialQuery)
    : activeFilters.length;
  const hasAppliedFilters = activeFilters.length > 0;

  function appliedFilters(): DraftFilters {
    return {
      category: initialCategory,
      brand: initialBrand,
      country: initialCountry,
      storeId: initialStoreId,
    };
  }

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
      router.push(queryString ? `${basePath}?${queryString}` : basePath);
    });
  }

  function submitAll() {
    const params = new URLSearchParams();
    const trimmed = query.trim();

    if (trimmed) {
      params.set("q", trimmed);
    }
    if (draft.category) {
      params.set("category", draft.category);
    }
    if (draft.brand) {
      params.set("brand", draft.brand);
    }
    if (draft.country) {
      params.set("country", draft.country);
    }
    if (draft.storeId) {
      params.set("storeId", draft.storeId);
    }

    startTransition(() => {
      const queryString = params.toString();
      router.push(queryString ? `${basePath}?${queryString}` : basePath);
    });
  }

  function toggleDraft(key: keyof DraftFilters, value: string) {
    setDraft((current) => ({
      ...current,
      [key]: current[key] === value ? "" : value,
    }));
  }

  function toggleParam(key: string, value: string, current: string) {
    navigate({ [key]: current === value ? null : value });
  }

  function handleSearch() {
    if (submitOnButtonOnly) {
      submitAll();
      return;
    }

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
      if (submitOnButtonOnly) {
        setDraft({ category: "", brand: "", country: "", storeId: "" });
        if (hasAppliedFilters || initialQuery) {
          startTransition(() => router.push(basePath));
        }
        return;
      }

      if (initialQuery) {
        navigate({ q: null });
      }
    }
  }

  function clearAll() {
    setQuery("");
    setDraft({ category: "", brand: "", country: "", storeId: "" });
    setFiltersOpen(false);
    startTransition(() => {
      router.push(basePath);
    });
  }

  function clearAppliedFilter(key: string) {
    if (submitOnButtonOnly) {
      const next = { ...draft };
      if (key === "q") {
        setQuery("");
      } else {
        next[key as keyof DraftFilters] = "";
        setDraft(next);
      }
      const params = new URLSearchParams(searchParams.toString());
      params.delete(key);
      params.delete("page");
      const trimmed = key === "q" ? "" : query.trim();
      if (trimmed && key !== "q") {
        params.set("q", trimmed);
      }
      startTransition(() => {
        const qs = params.toString();
        router.push(qs ? `${basePath}?${qs}` : basePath);
      });
      return;
    }

    navigate({ [key]: null });
  }

  return (
    <section className="relative sticky top-[73px] z-30 space-y-3 rounded-2xl border border-zinc-200/70 bg-white/95 p-3 shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-2">
        <label className="group relative min-w-0 flex-1">
          <span className="sr-only">Sök produkter</span>
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 transition group-focus-within:text-zinc-600">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            id="product-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Namn, EAN, slug eller länk…"
            aria-describedby="product-search-hint"
            className="h-11 w-full rounded-xl bg-zinc-100/80 py-2 pl-10 pr-9 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200/80"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Rensa sökfält"
              className="absolute right-2.5 top-1/2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-200/60 hover:text-zinc-600"
            >
              <CloseIcon />
            </button>
          ) : null}
        </label>

        <button
          type="button"
          onClick={handleSearch}
          disabled={pending}
          className="h-11 shrink-0 cursor-pointer rounded-xl bg-zinc-900 px-4 text-xs font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50"
        >
          Sök
        </button>

        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          aria-label="Filter"
          className={`relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl transition ${
            filtersOpen || draftFilterCount > 0
              ? "bg-zinc-900 text-white"
              : "bg-zinc-100/80 text-zinc-500 hover:bg-zinc-200/80 hover:text-zinc-700"
          }`}
        >
          <SlidersIcon />
          {draftFilterCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
              {draftFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      <p id="product-search-hint" className="text-[11px] leading-5 text-zinc-500">
        Sök på produktnamn, EAN, slug eller klistra in WooCommerce-länk.
      </p>

      {submitOnButtonOnly ? (
        <p className="text-[11px] text-zinc-500">
          Välj filter och tryck <span className="font-semibold">Sök</span> för att
          visa produkter.
        </p>
      ) : null}

      {filtersOpen ? (
        <div className="space-y-3 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
          {filterOptions.categories.length > 0 ? (
            <FilterRow label="Kategori">
              {filterOptions.categories.map((category) => (
                <FilterChip
                  key={category}
                  label={category}
                  selected={chipFilters.category === category}
                  pending={pending}
                  onClick={() =>
                    submitOnButtonOnly
                      ? toggleDraft("category", category)
                      : toggleParam("category", category, initialCategory)
                  }
                />
              ))}
            </FilterRow>
          ) : null}

          {filterOptions.brands.length > 0 ? (
            <FilterRow label="Varumärke">
              {filterOptions.brands.map((brand) => (
                <FilterChip
                  key={brand}
                  label={brand}
                  selected={chipFilters.brand === brand}
                  pending={pending}
                  onClick={() =>
                    submitOnButtonOnly
                      ? toggleDraft("brand", brand)
                      : toggleParam("brand", brand, initialBrand)
                  }
                  accent="violet"
                />
              ))}
            </FilterRow>
          ) : null}

          {filterOptions.countries.length > 0 ? (
            <FilterRow label="Land">
              {filterOptions.countries.map((country) => (
                <FilterChip
                  key={country}
                  label={country}
                  selected={chipFilters.country === country}
                  pending={pending}
                  onClick={() =>
                    submitOnButtonOnly
                      ? toggleDraft("country", country)
                      : toggleParam("country", country, initialCountry)
                  }
                  accent="blue"
                />
              ))}
            </FilterRow>
          ) : null}

          {showStoreFilter && stores.length > 0 ? (
            <FilterRow label="Butik">
              <FilterChip
                label="Alla butiker"
                selected={!chipFilters.storeId}
                pending={pending}
                onClick={() =>
                  submitOnButtonOnly
                    ? setDraft((current) => ({ ...current, storeId: "" }))
                    : navigate({ storeId: null })
                }
              />
              {stores.map((store) => (
                <FilterChip
                  key={store.id}
                  label={store.name}
                  selected={chipFilters.storeId === store.id}
                  pending={pending}
                  onClick={() =>
                    submitOnButtonOnly
                      ? toggleDraft("storeId", store.id)
                      : toggleParam("storeId", store.id, initialStoreId)
                  }
                />
              ))}
            </FilterRow>
          ) : null}
        </div>
      ) : null}

      {hasAppliedFilters ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-2">
          {activeFilters.map((filter) => (
            <button
              key={`${filter.key}-${filter.value}`}
              type="button"
              disabled={pending}
              onClick={() => clearAppliedFilter(filter.key)}
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

function countDraftFilters(
  draft: DraftFilters,
  query: string,
  appliedQuery: string,
): number {
  let count = 0;
  if (draft.category) {
    count += 1;
  }
  if (draft.brand) {
    count += 1;
  }
  if (draft.country) {
    count += 1;
  }
  if (draft.storeId) {
    count += 1;
  }
  if (query.trim() && query.trim() !== appliedQuery) {
    count += 1;
  }
  return count;
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 px-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </div>
  );
}

function buildActiveFilters({
  q,
  category,
  brand,
  country,
  storeId,
  stores,
}: {
  q: string;
  category: string;
  brand: string;
  country: string;
  storeId: string;
  stores: StoreOption[];
}): ActiveFilter[] {
  const filters: ActiveFilter[] = [];

  if (q) {
    filters.push({ key: "q", value: q, label: `“${q}”` });
  }

  if (category) {
    filters.push({ key: "category", value: category, label: category });
  }

  if (brand) {
    filters.push({ key: "brand", value: brand, label: brand });
  }

  if (country) {
    filters.push({ key: "country", value: country, label: country });
  }

  if (storeId) {
    const storeName =
      stores.find((store) => store.id === storeId)?.name ?? "Butik";
    filters.push({ key: "storeId", value: storeId, label: storeName });
  }

  return filters;
}

function FilterChip({
  label,
  selected,
  pending,
  onClick,
  accent = "dark",
}: {
  label: string;
  selected: boolean;
  pending: boolean;
  onClick: () => void;
  accent?: "dark" | "violet" | "blue";
}) {
  const selectedStyles = {
    dark: "bg-zinc-900 text-white shadow-sm",
    violet: "bg-violet-600 text-white shadow-sm",
    blue: "bg-blue-600 text-white shadow-sm",
  };

  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
        selected
          ? selectedStyles[accent]
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
