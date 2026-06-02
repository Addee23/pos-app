"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type AsyncPendingContextValue = {
  trackAsync: <T>(fn: () => Promise<T>) => Promise<T>;
};

const AsyncPendingContext = createContext<AsyncPendingContextValue | null>(null);

const SHOW_PILL_DELAY_MS = 450;

export function AsyncPendingProvider({ children }: { children: ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [pillVisible, setPillVisible] = useState(false);
  const countRef = useRef(0);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const adjustCount = useCallback((delta: number) => {
    countRef.current = Math.max(0, countRef.current + delta);
    setPendingCount(countRef.current);

    if (countRef.current > 0) {
      if (!showTimerRef.current) {
        showTimerRef.current = setTimeout(() => {
          if (countRef.current > 0) {
            setPillVisible(true);
          }
          showTimerRef.current = null;
        }, SHOW_PILL_DELAY_MS);
      }
      return;
    }

    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    setPillVisible(false);
  }, []);

  const trackAsync = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      adjustCount(1);
      try {
        return await fn();
      } finally {
        adjustCount(-1);
      }
    },
    [adjustCount],
  );

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
      if (!shouldTrackFetch(input)) {
        return originalFetch(input, init);
      }

      adjustCount(1);
      try {
        return await originalFetch(input, init);
      } finally {
        adjustCount(-1);
      }
    };

    return () => {
      window.fetch = originalFetch;
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
      }
    };
  }, [adjustCount]);

  const isActive = pendingCount > 0;

  return (
    <AsyncPendingContext.Provider value={{ trackAsync }}>
      {children}

      {isActive ? (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-[110] h-[3px] overflow-hidden bg-blue-100/70"
        >
          <div className="h-full w-2/5 animate-[nav-progress_0.75s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-blue-600 via-sky-400 to-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.45)]" />
        </div>
      ) : null}

      {pillVisible && isActive ? (
        <div
          role="status"
          aria-live="polite"
          aria-label="Bearbetar begäran"
          className="pointer-events-none fixed inset-x-0 bottom-24 z-[110] flex justify-center px-4 lg:bottom-8"
        >
          <div className="async-pending-pill flex items-center gap-2.5 rounded-full border border-zinc-200/70 bg-white/95 px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-xl shadow-zinc-900/10 backdrop-blur-md">
            <PendingSpinner />
            <span>Bearbetar…</span>
          </div>
        </div>
      ) : null}
    </AsyncPendingContext.Provider>
  );
}

export function useAsyncAction() {
  const context = useContext(AsyncPendingContext);

  return useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      if (context) {
        return context.trackAsync(fn);
      }
      return fn();
    },
    [context],
  );
}

function PendingSpinner() {
  return (
    <span
      aria-hidden
      className="relative flex size-4 shrink-0 items-center justify-center"
    >
      <span className="absolute inset-0 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600" />
    </span>
  );
}

function shouldTrackFetch(input: RequestInfo | URL): boolean {
  try {
    const url =
      typeof input === "string"
        ? new URL(input, window.location.origin)
        : input instanceof URL
          ? input
          : new URL(input.url, window.location.origin);

    return (
      url.origin === window.location.origin && url.pathname.startsWith("/api/")
    );
  } catch {
    return false;
  }
}
