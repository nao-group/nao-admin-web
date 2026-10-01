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
  reimbursement: number;
  admin_fee: number;
  notes?: string | null;
};

export type StaffOption = {
  id: number;
  full_name: string;
  role_label: string;
  base_salary: number;
  allowance: number;
};
