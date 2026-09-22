"use client";

import { create } from "zustand";
import { initialBanners } from "@/app/(admin)/announcements/banners/data";
import { initialEmails } from "@/app/(admin)/emails/data";
import { initialReferrals } from "@/app/(admin)/referrals/data";
import { initialAutoExpenseRules, initialDokuFees, initialExpenses, initialIncomes, initialPayrolls, initialStaff } from "@/app/(admin)/finance/data";
import type { Banner, EmailCampaign, Referral } from "@/types/admin";
import type { AutoExpenseRule, DokuFee, Expense, Income, Payroll, Staff } from "@/types/admin";

type AdminState = {
  banners: Banner[];
  referrals: Referral[];
  emails: EmailCampaign[];
  incomes: Income[];
  expenses: Expense[];
  staff: Staff[];
  dokuFees: DokuFee[];
  payrolls: Payroll[];
  autoExpenseRules: AutoExpenseRule[];
  saveBanner: (item: Banner) => void;
  deleteBanner: (id: number) => void;
  reorderBanners: (activeId: number, overId: number) => void;
  saveReferral: (item: Referral) => void;
  deleteReferral: (id: number) => void;
  saveEmail: (item: EmailCampaign) => void;
  deleteEmail: (id: number) => void;
  saveIncome: (item: Income) => void;
  deleteIncome: (id: number) => void;
  saveExpense: (item: Expense) => void;
  deleteExpense: (id: number) => void;
  saveStaff: (item: Staff) => void;
  deleteStaff: (id: number) => void;
  saveDokuFee: (item: DokuFee) => void;
  savePayroll: (item: Payroll) => void;
  saveAutoExpenseRule: (item: AutoExpenseRule) => void;
  deleteAutoExpenseRule: (id: number) => void;
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
  incomes: initialIncomes,
  expenses: initialExpenses,
  staff: initialStaff,
  dokuFees: initialDokuFees,
  payrolls: initialPayrolls,
  autoExpenseRules: initialAutoExpenseRules,
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
  saveIncome: (item) => set((state) => ({ incomes: upsert(state.incomes, item) })),
  deleteIncome: (id) => set((state) => ({ incomes: state.incomes.filter((item) => item.id !== id) })),
  saveExpense: (item) => set((state) => ({ expenses: upsert(state.expenses, item) })),
  deleteExpense: (id) => set((state) => ({ expenses: state.expenses.filter((item) => item.id !== id) })),
  saveStaff: (item) => set((state) => ({ staff: upsert(state.staff, item) })),
  deleteStaff: (id) => set((state) => ({ staff: state.staff.filter((item) => item.id !== id) })),
  saveDokuFee: (item) => set((state) => ({ dokuFees: upsert(state.dokuFees, item) })),
  savePayroll: (item) => set((state) => ({ payrolls: upsert(state.payrolls, item) })),
  saveAutoExpenseRule: (item) => set((state) => ({ autoExpenseRules: upsert(state.autoExpenseRules, item) })),
  deleteAutoExpenseRule: (id) => set((state) => ({ autoExpenseRules: state.autoExpenseRules.filter((item) => item.id !== id) })),
}));
