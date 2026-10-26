"use client";

/**
 * Browser-side cart (localStorage). Prices stored here are DISPLAY ONLY —
 * the server re-checks availability and re-prices every item at checkout.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  domain: string;
  tld: string;
  years: number;
  /** Display prices in minor units (server-confirmed at checkout). */
  priceMinor: number;
  renewalMinor: number;
  currency: string;
  premium?: boolean;
};

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (domain: string) => void;
  setYears: (domain: string, years: number) => void;
  clear: () => void;
  has: (domain: string) => boolean;
  count: number;
  totalMinor: number;
  hydrated: boolean;
};

const STORAGE_KEY = "2moretechs.cart.v1";
const MAX_YEARS = 10;

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load once on mount (deferring past the first paint avoids both the
  // SSR/localStorage mismatch and setState-in-effect).
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as CartItem[];
          if (Array.isArray(parsed)) setItems(parsed);
        }
      } catch {
        /* corrupted cart → start empty */
      }
      setHydrated(true);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  // Persist changes after hydration.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full/unavailable — cart stays in memory */
    }
  }, [items, hydrated]);

  const add = useCallback((item: CartItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.domain === item.domain)) return prev;
      if (prev.length >= 12) return prev;
      return [...prev, { ...item, years: Math.min(Math.max(item.years, 1), MAX_YEARS) }];
    });
  }, []);

  const remove = useCallback((domain: string) => {
    setItems((prev) => prev.filter((i) => i.domain !== domain));
  }, []);

  const setYears = useCallback((domain: string, years: number) => {
    const y = Math.min(Math.max(Math.trunc(years) || 1, 1), MAX_YEARS);
    setItems((prev) => prev.map((i) => (i.domain === domain ? { ...i, years: y } : i)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const has = useCallback((domain: string) => items.some((i) => i.domain === domain), [items]);

  const value = useMemo<CartState>(
    () => ({
      items,
      add,
      remove,
      setYears,
      clear,
      has,
      count: items.length,
      totalMinor: items.reduce((sum, i) => sum + estimateLine(i), 0),
      hydrated,
    }),
    [items, add, remove, setYears, clear, has, hydrated],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** Year 1 at registration price, remaining years at renewal (display estimate). */
export function estimateLine(item: CartItem): number {
  return item.priceMinor + item.renewalMinor * Math.max(item.years - 1, 0);
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
