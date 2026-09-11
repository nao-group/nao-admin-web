"use client";

import { create } from "zustand";
import type { AdminSession } from "@/lib/admin-access";

type AuthState = {
  session: AdminSession | null;
  setSession: (session: AdminSession) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  clearSession: () => set({ session: null }),
}));
