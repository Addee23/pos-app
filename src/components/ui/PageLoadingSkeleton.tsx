type PageLoadingSkeletonProps = {
  title?: string;
  variant?: "default" | "dashboard" | "products" | "kassa" | "pickup" | "search";
};

export function PageLoadingSkeleton({
  title = "Laddar sidan…",
  variant = "default",
}: PageLoadingSkeletonProps) {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-live="polite"
      aria-label={title}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm">
        <span
          aria-hidden
          className="relative flex size-5 shrink-0 items-center justify-center"
        >
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600" />
        </span>
        <p className="text-sm font-semibold text-zinc-700">{title}</p>
      </div>

      {variant === "dashboard" ? <DashboardSkeleton /> : null}
      {variant === "products" ? <ProductsSkeleton /> : null}
      {variant === "kassa" ? <KassaSkeleton /> : null}
      {variant === "pickup" ? <PickupSkeleton /> : null}
      {variant === "search" ? <SearchSkeleton /> : null}
      {variant === "default" ? <DefaultSkeleton /> : null}
    </div>
  );
}

function DefaultSkeleton() {
  return (
    <>
      <div className="h-24 animate-pulse rounded-3xl bg-zinc-200/70" />
      <div className="h-40 animate-pulse rounded-3xl bg-zinc-200/60" />
      <div className="h-32 animate-pulse rounded-3xl bg-zinc-200/50" />
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="h-16 animate-pulse rounded-3xl bg-zinc-200/70" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-3xl bg-zinc-200/60"
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-56 animate-pulse rounded-3xl bg-zinc-200/50" />
        <div className="h-56 animate-pulse rounded-3xl bg-zinc-200/50" />
      </div>
    </>
  );
}

function ProductsSkeleton() {
  return (
    <>
      <div className="h-36 animate-pulse rounded-lg bg-zinc-200/70" />
      <div className="h-16 animate-pulse rounded-2xl bg-zinc-200/60" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-2xl bg-zinc-200/50"
          />
        ))}
      </div>
    </>
  );
}

function KassaSkeleton() {
  return (
    <>
      <div className="h-14 animate-pulse rounded-3xl bg-zinc-200/70" />
      <div className="h-28 animate-pulse rounded-3xl bg-zinc-200/60" />
      <div className="h-64 animate-pulse rounded-3xl bg-zinc-200/50" />
    </>
  );
}

function PickupSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-2xl bg-zinc-200/70"
          />
        ))}
      </div>
      <div className="h-24 animate-pulse rounded-lg bg-zinc-200/60" />
      <div className="h-48 animate-pulse rounded-lg bg-zinc-200/50" />
    </>
  );
}

function SearchSkeleton() {
  return (
    <>
      <div className="h-16 animate-pulse rounded-2xl bg-zinc-200/70" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl bg-zinc-200/50"
          />
        ))}
      </div>
    </>
  );
}
