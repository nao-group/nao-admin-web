"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthState = {
  authenticated: boolean;
  hydrated: boolean;
  login: () => void;
  logout: () => void;
  setHydrated: (value: boolean) => void;
};

export const useAuthStore = create<AuthState>()(persist(
  (set) => ({
    authenticated: false,
    hydrated: false,
    login: () => set({ authenticated: true }),
    logout: () => set({ authenticated: false }),
    setHydrated: (hydrated) => set({ hydrated }),
  }),
  {
    name: "nao-admin-auth",
    partialize: (state) => ({ authenticated: state.authenticated }),
    onRehydrateStorage: () => (state) => state?.setHydrated(true),
  },
));
