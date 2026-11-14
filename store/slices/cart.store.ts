"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  id: number | string;
  name: string;
  price: number;
  regular_price?: number | null;
  image_url?: string | null;
  brand?: string | null;
  quantity: number;
  business_id?: number | null;
  business_name?: string | null;
  business_slug?: string | null;
  institution_id?: number | null;
  currency?: string | null;
  unit?: string | null;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;

  // Actions
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (id: number | string) => void;
  updateQuantity: (id: number | string, quantity: number) => void;
  clearCart: () => void;
  setIsOpen: (isOpen: boolean) => void;
  toggleCart: () => void;

  // Selectors / Helpers
  getItemQuantity: (id: number | string) => number;
  getTotalCount: () => number;
  getTotalAmount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item, quantity = 1) => {
        const currentItems = get().items;
        const existingIndex = currentItems.findIndex(
          (i) => String(i.id) === String(item.id)
        );

        if (existingIndex > -1) {
          const updated = [...currentItems];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + quantity,
          };
          set({ items: updated });
        } else {
          set({
            items: [
              ...currentItems,
              {
                ...item,
                quantity: Math.max(1, quantity),
              },
            ],
          });
        }
      },

      removeItem: (id) => {
        set({
          items: get().items.filter((i) => String(i.id) !== String(id)),
        });
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set({
          items: get().items.map((i) =>
            String(i.id) === String(id) ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      setIsOpen: (isOpen) => set({ isOpen }),

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      getItemQuantity: (id) => {
        const found = get().items.find((i) => String(i.id) === String(id));
        return found ? found.quantity : 0;
      },

      getTotalCount: () => {
        return get().items.reduce((acc, item) => acc + item.quantity, 0);
      },

      getTotalAmount: () => {
        return get().items.reduce(
          (acc, item) => acc + (Number(item.price) || 0) * item.quantity,
          0
        );
      },
    }),
    {
      name: "edubird-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);

