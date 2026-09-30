import type { ExpenseCategory } from "../expenses/types";

export type AutoExpenseRuleRow = {
  id: number;
  name: string;
  category: ExpenseCategory;
  amount: number;
  frequency: "monthly" | "weekly" | "yearly";
  day_of_month: number | null;
  paid_by: string;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type AutoExpenseRuleWritePayload = {
  name: string;
  category: ExpenseCategory;
  amount: number;
  day_of_month: number;
  paid_by: string;
  notes?: string | null;
  active: boolean;
};
