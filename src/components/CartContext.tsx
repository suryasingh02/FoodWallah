"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  name: string;
  price: number;
  quantity: number;
  vendorId?: string;
};

type CartContextValue = {
  addItem: (item: Omit<CartItem, "quantity">) => void;
  clearCart: () => void;
  decreaseItem: (name: string) => void;
  getQuantity: (name: string) => number;
  itemCount: number;
  items: CartItem[];
};

const CART_STORAGE_KEY = "juniper-stone-cart";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const loadCart = () => {
      const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);

      if (savedCart) {
        try {
          const savedItems = JSON.parse(savedCart) as CartItem[];
          setItems((currentItems) => {
            const mergedItems = new Map(savedItems.map((item) => [item.name, item]));

            currentItems.forEach((item) => {
              const savedItem = mergedItems.get(item.name);
              mergedItems.set(item.name, savedItem
                ? { ...savedItem, quantity: savedItem.quantity + item.quantity }
                : item);
            });

            return Array.from(mergedItems.values());
          });
        } catch {
          window.localStorage.removeItem(CART_STORAGE_KEY);
        }
      }

      setHasHydrated(true);
    };

    const timer = window.setTimeout(loadCart, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hasHydrated) {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [hasHydrated, items]);

  const value = useMemo<CartContextValue>(() => {
    const addItem = (item: Omit<CartItem, "quantity">) => {
      setItems((currentItems) => {
        const existingItem = currentItems.find((currentItem) => currentItem.name === item.name);

        if (existingItem) {
          return currentItems.map((currentItem) =>
            currentItem.name === item.name
              ? { ...currentItem, quantity: currentItem.quantity + 1 }
              : currentItem,
          );
        }

        return [...currentItems, { ...item, quantity: 1 }];
      });
    };

    const decreaseItem = (name: string) => {
      setItems((currentItems) =>
        currentItems
          .map((item) => (item.name === name ? { ...item, quantity: item.quantity - 1 } : item))
          .filter((item) => item.quantity > 0),
      );
    };

    const clearCart = () => {
      setItems([]);
    };

    return {
      addItem,
      clearCart,
      decreaseItem,
      getQuantity: (name: string) => items.find((item) => item.name === name)?.quantity ?? 0,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      items,
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
}