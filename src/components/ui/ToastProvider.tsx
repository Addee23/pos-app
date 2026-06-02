"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ToastType = "success" | "error" | "warning" | "info";

type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  toast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 4500;
const MAX_TOASTS = 4;

const TOAST_STYLES: Record<
  ToastType,
  { surface: string; icon: string; label: string }
> = {
  success: {
    surface: "border-emerald-200/80 bg-emerald-50 text-emerald-900 shadow-emerald-100/60",
    icon: "✓",
    label: "Klart",
  },
  error: {
    surface: "border-red-200/80 bg-red-50 text-red-900 shadow-red-100/60",
    icon: "!",
    label: "Fel",
  },
  warning: {
    surface: "border-amber-200/80 bg-amber-50 text-amber-950 shadow-amber-100/60",
    icon: "!",
    label: "Obs",
  },
  info: {
    surface: "border-sky-200/80 bg-sky-50 text-sky-950 shadow-sky-100/60",
    icon: "i",
    label: "Info",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (type: ToastType, message: string) => {
      const id = crypto.randomUUID();
      setToasts((current) =>
        [...current, { id, type, message }].slice(-MAX_TOASTS),
      );
      window.setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: pushToast,
      success: (message) => pushToast("success", message),
      error: (message) => pushToast("error", message),
      warning: (message) => pushToast("warning", message),
      info: (message) => pushToast("info", message),
    }),
    [pushToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[120] flex flex-col gap-2 px-4 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:max-w-sm lg:items-end lg:px-0"
      >
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast måste användas inom ToastProvider");
  }
  return context;
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const style = TOAST_STYLES[toast.type];

  return (
    <div
      role="alert"
      className={`toast-enter pointer-events-auto flex items-start gap-3 rounded-2xl border px-3.5 py-3 shadow-lg ${style.surface}`}
    >
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-white/80 text-xs font-bold">
        {style.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
          {style.label}
        </p>
        <p className="mt-0.5 text-sm font-semibold leading-5">{toast.message}</p>
      </div>
      <button
        type="button"
        aria-label="Stäng meddelande"
        onClick={onDismiss}
        className="pointer-events-auto -mr-1 shrink-0 cursor-pointer rounded-lg px-2 py-1 text-sm font-bold opacity-50 transition hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
