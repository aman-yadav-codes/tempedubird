// store/slices/auth.store.ts
// Global auth state stored only in memory.

import { create } from "zustand";
import { hasPermission as userHasPermission } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session-user";

export type SafeUser = SessionUser;

interface AuthState {
  user: SafeUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;

  setAuth: (user: SafeUser, accessToken: string) => void;
  clearAuth: () => void;
  setInitialized: () => void;
  updateUser: (partial: Partial<SafeUser>) => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string, institutionId?: number | null) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitialized: false,

  setAuth: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true }),

  clearAuth: () =>
    set({ user: null, accessToken: null, isAuthenticated: false }),

  setInitialized: () => set({ isInitialized: true }),

  updateUser: (partial) => {
    const current = get().user;
    if (!current) return;
    set({ user: { ...current, ...partial } });
  },

  hasRole: (role) => {
    const user = get().user;
    return (
      user?.roles?.includes(role) ||
      user?.primary_role === role ||
      false
    );
  },

  hasPermission: (permission, institutionId = null) => {
    const user = get().user;
    return userHasPermission(user, permission, { institutionId });
  },
}));
