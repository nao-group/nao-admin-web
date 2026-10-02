"use client";

import { create } from "zustand";
import { initialBanners } from "@/app/(admin)/announcements/banners/data";
import { initialEmails } from "@/app/(admin)/emails/data";
import { initialReferrals } from "@/app/(admin)/referrals/data";
import type { Banner, EmailCampaign, Referral } from "@/types/admin";

type AdminState = {
  banners: Banner[];
  referrals: Referral[];
  emails: EmailCampaign[];
  saveBanner: (item: Banner) => void;
  deleteBanner: (id: number) => void;
  reorderBanners: (activeId: number, overId: number) => void;
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
  banners: initialBanners,
  referrals: initialReferrals,
  emails: initialEmails,
  saveBanner: (item) => set((state) => ({ banners: upsert(state.banners, item) })),
  deleteBanner: (id) => set((state) => ({ banners: state.banners.filter((item) => item.id !== id) })),
  reorderBanners: (activeId, overId) => set((state) => {
    const from = state.banners.findIndex((item) => item.id === activeId);
    const to = state.banners.findIndex((item) => item.id === overId);
    if (from < 0 || to < 0 || from === to) return state;

    const banners = [...state.banners];
    const [moved] = banners.splice(from, 1);
    banners.splice(to, 0, moved);
    return { banners };
  }),
  saveReferral: (item) => set((state) => ({ referrals: upsert(state.referrals, item) })),
  deleteReferral: (id) => set((state) => ({ referrals: state.referrals.filter((item) => item.id !== id) })),
  saveEmail: (item) => set((state) => ({ emails: upsert(state.emails, item) })),
  deleteEmail: (id) => set((state) => ({ emails: state.emails.filter((item) => item.id !== id) })),
}));
