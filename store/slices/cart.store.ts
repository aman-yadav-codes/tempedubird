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
  professional_id?: number | null;
  currency?: string | null;
  unit?: string | null;
  item_type?: "product" | "service";
}

export interface CartConflictInfo {
  isOpen: boolean;
  pendingItem?: Omit<CartItem, "quantity"> | null;
  pendingQuantity?: number;
  onConfirmCallback?: (() => void) | null;
  currentStoreName: string;
  newStoreName: string;
  currentType: "product" | "service";
  newType: "product" | "service";
  reason: "store" | "type" | "both";
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  conflict: CartConflictInfo | null;

  // Actions
  addItem: (
    item: Omit<CartItem, "quantity">,
    quantity?: number,
    options?: { force?: boolean }
  ) => boolean;
  removeItem: (id: number | string) => void;
  updateQuantity: (id: number | string, quantity: number) => void;
  clearCart: () => void;
  setIsOpen: (isOpen: boolean) => void;
  toggleCart: () => void;
  resolveConflict: (action: "replace" | "cancel") => void;
  promptConflict: (config: {
    currentStoreName: string;
    newStoreName: string;
    currentType: "product" | "service";
    newType: "product" | "service";
    reason: "store" | "type" | "both";
    onConfirm: () => void;
  }) => void;
  clearConflict: () => void;

  // Selectors / Helpers
  getItemQuantity: (id: number | string) => number;
  getTotalCount: () => number;
  getTotalAmount: () => number;
}

/**
 * Helper to determine if two cart items originate from the exact same storefront / provider.
 */
function isSameStore(
  itemA: CartItem,
  itemB: CartItem | Omit<CartItem, "quantity">
): boolean {
  // If both have business_id
  if (itemA.business_id && itemB.business_id) {
    return Number(itemA.business_id) === Number(itemB.business_id);
  }
  // If both have professional_id
  if (itemA.professional_id && itemB.professional_id) {
    return Number(itemA.professional_id) === Number(itemB.professional_id);
  }
  // Cross check: one business and one professional is different store
  if (
    (itemA.business_id && itemB.professional_id) ||
    (itemA.professional_id && itemB.business_id)
  ) {
    return false;
  }
  // If both have institution_id
  if (itemA.institution_id && itemB.institution_id) {
    return Number(itemA.institution_id) === Number(itemB.institution_id);
  }
  // Compare business names
  if (itemA.business_name && itemB.business_name) {
    return (
      itemA.business_name.trim().toLowerCase() ===
      itemB.business_name.trim().toLowerCase()
    );
  }
  // If one has business_id and the other does not match
  if (itemA.business_id !== itemB.business_id) {
    return false;
  }
  return true;
}

/**
 * Helper to determine if two cart items belong to the same category ("product" vs "service").
 */
function isSameItemType(
  itemA: CartItem,
  itemB: CartItem | Omit<CartItem, "quantity">
): boolean {
  const typeA = itemA.item_type || "product";
  const typeB = itemB.item_type || "product";
  return typeA === typeB;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      conflict: null,

      addItem: (item, quantity = 1, options) => {
        const currentItems = get().items;

        // If cart has items and force is not specified, check for store & category conflict
        if (currentItems.length > 0 && !options?.force) {
          const firstItem = currentItems[0];
          const sameStore = isSameStore(firstItem, item);
          const sameType = isSameItemType(firstItem, item);

          if (!sameStore || !sameType) {
            const curStore =
              firstItem.business_name || firstItem.brand || "previous store";
            const newStore = item.business_name || item.brand || "new store";
            const curType = firstItem.item_type || "product";
            const newType = item.item_type || "product";
            const reason =
              !sameStore && !sameType ? "both" : !sameStore ? "store" : "type";

            set({
              conflict: {
                isOpen: true,
                pendingItem: item,
                pendingQuantity: quantity,
                currentStoreName: curStore,
                newStoreName: newStore,
                currentType: curType,
                newType: newType,
                reason,
              },
            });
            return false;
          }
        }

        // Add or update item in cart
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
                item_type: item.item_type || "product",
              },
            ],
          });
        }
        return true;
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

      resolveConflict: (action) => {
        const conflict = get().conflict;
        if (!conflict) return;

        if (action === "replace") {
          if (conflict.pendingItem) {
            set({
              items: [
                {
                  ...conflict.pendingItem,
                  quantity: Math.max(1, conflict.pendingQuantity || 1),
                  item_type: conflict.pendingItem.item_type || "product",
                },
              ],
              conflict: null,
            });
          } else {
            set({ items: [], conflict: null });
          }

          if (conflict.onConfirmCallback) {
            conflict.onConfirmCallback();
          }
        } else {
          set({ conflict: null });
        }
      },

      promptConflict: (config) => {
        set({
          conflict: {
            isOpen: true,
            pendingItem: null,
            pendingQuantity: 1,
            currentStoreName: config.currentStoreName,
            newStoreName: config.newStoreName,
            currentType: config.currentType,
            newType: config.newType,
            reason: config.reason,
            onConfirmCallback: config.onConfirm,
          },
        });
      },

      clearConflict: () => set({ conflict: null }),

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
