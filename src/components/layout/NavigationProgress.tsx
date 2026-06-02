"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const NavPendingContext = createContext<() => void>(() => {});

export function NavPendingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname]);

  return (
    <NavPendingContext.Provider value={() => setPending(true)}>
      {children}
      {pending ? (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-orange-100"
        >
          <div className="h-full w-1/3 animate-[nav-progress_0.8s_ease-in-out_infinite] rounded-full bg-orange-500" />
        </div>
      ) : null}
    </NavPendingContext.Provider>
  );
}

export function useStartNavigation() {
  return useContext(NavPendingContext);
}
