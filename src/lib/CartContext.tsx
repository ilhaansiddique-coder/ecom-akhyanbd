"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";

export interface CartItem {
  id: number;
  variantId?: number;
  name: string;
  variantLabel?: string;
  price: number;
  image: string;
  quantity: number;
  stock?: number;        // available stock (undefined = unlimited)
  unlimitedStock?: boolean;
}

interface CartContextType {
  items: CartItem[];
  hydrated: boolean;
  addItem: (product: { id: number; variantId?: number; name: string; variantLabel?: string; price: number; image: string; stock?: number; unlimitedStock?: boolean }, quantity?: number) => void;
  removeItem: (id: number, variantId?: number) => void;
  updateQuantity: (id: number, quantity: number, variantId?: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount (client only) + deduplicate
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cart_items");
      if (saved) {
        const parsed: CartItem[] = JSON.parse(saved);
        // Merge duplicates (same product + variant)
        const merged = new Map<string, CartItem>();
        for (const item of parsed) {
          const key = `${item.id}-${item.variantId != null ? item.variantId : "x"}`;
          const existing = merged.get(key);
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            merged.set(key, { ...item });
          }
        }
        setItems(Array.from(merged.values()));
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Persist to localStorage only after hydration
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem("cart_items", JSON.stringify(items));
    }
  }, [items, hydrated]);

  // Cart sync — runs once after hydration. Two jobs in one network call:
  //
  //   1. PRUNE stale items. A persisted cart can reference a product that
  //      admin since deleted / disabled, or a variant that was removed.
  //      The by-ids endpoint filters to active+non-deleted products only,
  //      so any cart id missing from the response is gone-for-good and
  //      we drop it silently. Same for variant ids that no longer exist.
  //      This stops checkout from throwing "Product not found: 41".
  //
  //   2. RE-HYDRATE missing images. Items added long ago can carry empty
  //      or placeholder image refs; we patch them from the live product /
  //      variant image while we have the response.
  //
  // Runs once per cart-id-set so it doesn't re-fire on every state change.
  // Re-fires when a NEW id appears (user added a fresh product).
  const syncedRef = useRef<string>("");
  useEffect(() => {
    if (!hydrated || items.length === 0) {
      syncedRef.current = "";
      return;
    }
    const ids = Array.from(new Set(items.map((i) => i.id))).sort((a, b) => a - b);
    const sig = ids.join(",");
    if (sig === syncedRef.current) return;
    syncedRef.current = sig;

    fetch(`/api/v1/products/by-ids?ids=${ids.join(",")}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data: { items: Array<{ id: number; image: string; hasVariations?: boolean; variants?: Array<{ id: number; image?: string }> }> }) => {
        const byId = new Map(data.items.map((p) => [p.id, p]));
        setItems((prev) => {
          const next: CartItem[] = [];
          for (const it of prev) {
            const p = byId.get(it.id);
            if (!p) {
              // Product deleted or disabled — drop it. No toast: the
              // cart drawer simply re-renders without that line. User
              // can still see what's left.
              continue;
            }
            // If the cart references a variant, make sure that variant
            // still exists + is active. Otherwise drop the line.
            if (it.variantId != null) {
              const variantStillExists = p.variants?.some((v) => v.id === it.variantId);
              if (!variantStillExists) continue;
            } else if (p.hasVariations && (p.variants?.length ?? 0) > 0) {
              // Cart line has NO variantId but the product is now variable
              // (likely added before the product was converted, or via a
              // buggy add-to-cart path). The order POST would reject this
              // anyway — drop it here so the cart doesn't carry a ghost
              // line the customer can't check out with. They'll need to
              // re-add via PDP and pick a size.
              continue;
            }
            // Patch missing/stale image while we're here.
            const img = (it.image || "").trim();
            const needsImg = !img || img === "/placeholder.svg" || img.endsWith("/placeholder.svg");
            if (!needsImg) {
              next.push(it);
              continue;
            }
            const variantImg = it.variantId
              ? p.variants?.find((v) => v.id === it.variantId)?.image
              : undefined;
            const fresh = variantImg || p.image;
            next.push(fresh ? { ...it, image: fresh } : it);
          }
          return next;
        });
      })
      .catch(() => {/* network blip — try again on next mount */});
  }, [hydrated, items]);

  // Cart key: same product + same variant = same cart item
  const cartKey = (id: number, variantId?: number) => `${id}-${variantId != null ? variantId : "x"}`;

  const addItem = useCallback((product: { id: number; variantId?: number; name: string; variantLabel?: string; price: number; image: string; stock?: number; unlimitedStock?: boolean }, quantity = 1) => {
    setItems((prev) => {
      const key = cartKey(product.id, product.variantId);
      const idx = prev.findIndex((i) => cartKey(i.id, i.variantId) === key);
      if (idx !== -1) {
        const updated = [...prev];
        let newQty = updated[idx].quantity + quantity;
        // Enforce stock limit
        const maxStock = product.stock ?? updated[idx].stock;
        if (maxStock != null && !product.unlimitedStock) newQty = Math.min(newQty, maxStock);
        updated[idx] = { ...updated[idx], ...product, quantity: newQty };
        return updated;
      }
      return [...prev, { ...product, quantity }];
    });
  }, []);

  const removeItem = useCallback((id: number, variantId?: number) => {
    const key = cartKey(id, variantId);
    setItems((prev) => prev.filter((i) => cartKey(i.id, i.variantId) !== key));
  }, []);

  const updateQuantity = useCallback((id: number, quantity: number, variantId?: number) => {
    if (quantity < 1) return;
    const key = cartKey(id, variantId);
    setItems((prev) => prev.map((i) => {
      if (cartKey(i.id, i.variantId) !== key) return i;
      // Enforce stock limit
      let q = quantity;
      if (i.stock != null && !i.unlimitedStock) q = Math.min(q, i.stock);
      return { ...i, quantity: q };
    }));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, hydrated, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
