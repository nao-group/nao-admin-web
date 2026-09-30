export type ExpenseCategory = "payroll" | "bank_fee" | "maintenance" | "other";
export type ExpenseStatus = "pending" | "done";

export type ExpenseRow = {
  id: number;
  reference: string;
  category: ExpenseCategory;
  custom_category: string | null;
  occurred_at: string;
  paid_by: string;
  evidence_url: string | null;
  evidence_file_path: string | null;
  amount: number;
  status: ExpenseStatus;
  notes: string | null;
  recurring: boolean;
  auto_expense_rule_id: number | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseListResult = { items: ExpenseRow[]; total: number; page: number; page_size: number };

export type ExpenseOverview = {
  paid_total: number;
  pending_total: number;
  active_automation_count: number;
};

export type ExpenseWritePayload = {
  reference: string;
  category: ExpenseCategory;
  custom_category?: string | null;
  occurred_at: string;
  paid_by: string;
  evidence_url?: string | null;
  amount: number;
  notes?: string | null;
  status: ExpenseStatus;
};

export type ExpenseListParams = {
  page: number;
  page_size: number;
  search?: string;
  category?: ExpenseCategory | null;
  status?: ExpenseStatus | null;
  date_from?: string;
  date_to?: string;
  sort?: string;
};
