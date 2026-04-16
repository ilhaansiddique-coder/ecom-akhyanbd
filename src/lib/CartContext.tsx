"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

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
