"use client";

import { create } from "zustand";
import { initialEmails } from "@/app/(admin)/emails/data";
import { initialReferrals } from "@/app/(admin)/referrals/data";
import type { EmailCampaign, Referral } from "@/types/admin";

type AdminState = {
  referrals: Referral[];
  emails: EmailCampaign[];
  saveReferral: (item: Referral) => void;
  deleteReferral: (id: number) => void;
  saveEmail: (item: EmailCampaign) => void;
  deleteEmail: (id: number) => void;
};

function upsert<T extends { id: number }>(items: T[], item: T) {
  const normalized: T = item.id === 0
    ? { ...item, id: Math.max(0, ...items.map((row) => row.id)) + 1 }
    : item;

  return items.some((row) => row.id === normalized.id)
    ? items.map((row) => row.id === normalized.id ? normalized : row)
    : [...items, normalized];
}

export const useAdminStore = create<AdminState>((set) => ({
  referrals: initialReferrals,
  emails: initialEmails,
  saveReferral: (item) => set((state) => ({ referrals: upsert(state.referrals, item) })),
  deleteReferral: (id) => set((state) => ({ referrals: state.referrals.filter((item) => item.id !== id) })),
  saveEmail: (item) => set((state) => ({ emails: upsert(state.emails, item) })),
  deleteEmail: (id) => set((state) => ({ emails: state.emails.filter((item) => item.id !== id) })),
}));
