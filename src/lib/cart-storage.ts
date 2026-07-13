export type SharedCartItem = {
  cartKey: string;
  productId: string;
  variantId: string | null;
  storeId: string;
  name: string;
  variantName: string | null;
  ean: string | null;
  imageUrl: string | null;
  description: string;
  stockLocation: string | null;
  price: number;
  quantity: number;
  maxQuantity: number;
};

type StoredCart = { storeId: string; items: SharedCartItem[] };

const KEY = "pos_cart";

export function loadCart(storeId: string): SharedCartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredCart;
    return parsed.storeId === storeId ? parsed.items : [];
  } catch {
    return [];
  }
}

export function loadRawCart(): StoredCart | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredCart;
  } catch {
    return null;
  }
}

export function saveCart(storeId: string, items: SharedCartItem[]): void {
  try {
    if (items.length === 0) {
      localStorage.removeItem(KEY);
      return;
    }
    localStorage.setItem(KEY, JSON.stringify({ storeId, items } satisfies StoredCart));
  } catch {
    // ignore storage errors (private browsing etc.)
  }
}

export function clearCart(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
