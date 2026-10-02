export type PayrollStatus = "pending" | "done";

export type PayrollStaff = {
  id: number;
  full_name: string;
  role: string;
  role_label: string;
  email: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
};

export type PayrollRow = {
  id: number;
  staff_id: number;
  period: string;
  base_salary: number;
  allowance: number;
  reimbursement: number;
  admin_fee: number;
  total_transfer: number;
  status: PayrollStatus;
  payslip_sent_at: string | null;
  finance_expense_id: number | null;
  notes: string | null;
  /** Draft created by the monthly job rather than by an admin. */
  auto_generated: boolean;
  staff: PayrollStaff;
  created_at: string;
  updated_at: string;
};

export type PayrollListResult = { items: PayrollRow[]; total: number; page: number; page_size: number };

export type PayrollOverview = {
  total_payroll: number;
  transferred: number;
  still_waiting: number;
  payslips_sent: number;
};

export type PayrollWritePayload = {
  staff_id: number;
  period: string;
  base_salary: number;
  allowance: number;
  // No reimbursement or admin_fee: the backend derives them from the staff
  // member's expenses and bank (non-BCA transfer fee).
  notes?: string | null;
};

/** An expense the staff member paid for, settled through this payroll. */
export type PayrollReimbursement = {
  id: number;
  reference: string;
  category: string;
  custom_category: string | null;
  occurred_at: string;
  amount: number;
  notes: string | null;
  status: PayrollStatus;
};

export type StaffOption = {
  id: number;
  full_name: string;
  role_label: string;
  base_salary: number;
  allowance: number;
  bank_name: string;
};

export type PayrollSettings = { non_bca_transfer_fee: number };
