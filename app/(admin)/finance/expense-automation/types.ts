import type { ExpenseCategory } from "../expenses/types";

/** Rules have no staff source, so they can't create reimbursements. */
export type AutoExpenseCategory = Exclude<ExpenseCategory, "reimbursement">;

export type AutoExpenseFrequency = "weekly" | "monthly" | "yearly";

export type AutoExpenseRuleRow = {
  id: number;
  name: string;
  category: AutoExpenseCategory;
  amount: number;
  frequency: AutoExpenseFrequency;
  /** weekly: 1 = Senin … 7 = Minggu */
  day_of_week: number | null;
  /** monthly (1–28) and yearly */
  day_of_month: number | null;
  /** yearly: 1 = Januari … 12 = Desember */
  month_of_year: number | null;
  paid_by: string;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type AutoExpenseRuleWritePayload = {
  name: string;
  category: AutoExpenseCategory;
  amount: number;
  frequency: AutoExpenseFrequency;
  day_of_week: number | null;
  day_of_month: number | null;
  month_of_year: number | null;
  paid_by: string;
  notes?: string | null;
  active: boolean;
};
