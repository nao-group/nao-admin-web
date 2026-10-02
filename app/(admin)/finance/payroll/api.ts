import type {
  PayrollListResult, PayrollOverview, PayrollReimbursement, PayrollRow, PayrollSettings, PayrollStatus, PayrollWritePayload,
  StaffOption,
} from "./types";

export class PayrollApiError extends Error {}

async function result<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new PayrollApiError(body.detail ?? "Request failed. Please try again.");
  return body as T;
}

export async function listPayroll(params: { page: number; page_size: number; period?: string; status?: PayrollStatus | null; search?: string }): Promise<PayrollListResult> {
  const query = new URLSearchParams({ page: String(params.page), page_size: String(params.page_size) });
  if (params.period) query.set("period", params.period);
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  return result(await fetch(`/api/admin/finance/payroll?${query}`, { cache: "no-store" }));
}

export async function getPayrollOverview(): Promise<PayrollOverview> {
  return result(await fetch("/api/admin/finance/payroll/overview", { cache: "no-store" }));
}

export async function createPayroll(payload: PayrollWritePayload): Promise<PayrollRow> {
  return result(await fetch("/api/admin/finance/payroll", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
  }));
}

export async function updatePayroll(id: number, payload: PayrollWritePayload): Promise<PayrollRow> {
  return result(await fetch(`/api/admin/finance/payroll/${id}`, {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
  }));
}

export async function updatePayrollStatus(id: number, status: PayrollStatus): Promise<PayrollRow> {
  return result(await fetch(`/api/admin/finance/payroll/${id}/status`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }),
  }));
}

export async function resendPayslip(id: number): Promise<PayrollRow> {
  return result(await fetch(`/api/admin/finance/payroll/${id}/resend-payslip`, { method: "POST" }));
}

export function payslipViewUrl(id: number): string {
  return `/api/admin/finance/payroll/${id}/payslip`;
}

export async function listStaffOptions(): Promise<StaffOption[]> {
  const response = await fetch("/api/admin/staff?page_size=100&status=active", { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new PayrollApiError(body.detail ?? "Failed to load staff list.");
  const roleLabels: Record<string, string> = { teacher: "Guru", employee: "Karyawan", executive: "C-Level" };
  const items = Array.isArray(body.items) ? body.items : [];
  return items.map((raw: Record<string, unknown>) => ({
    id: Number(raw.id),
    full_name: String(raw.full_name ?? ""),
    role_label: roleLabels[String(raw.role)] ?? String(raw.role ?? ""),
    base_salary: Number(raw.base_salary ?? 0),
    allowance: Number(raw.allowance ?? 0),
    bank_name: String(raw.bank_name ?? ""),
  }));
}

/** Runs the monthly draft job now; `period` defaults to the previous month. */
export async function generatePayrolls(period?: string): Promise<{ created: number }> {
  return result(await fetch("/api/admin/finance/payroll/generate", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(period ? { period } : {}),
  }));
}

export async function recalculatePayroll(id: number): Promise<PayrollRow> {
  return result(await fetch(`/api/admin/finance/payroll/${id}/recalculate`, { method: "POST" }));
}

export async function listPayrollReimbursements(id: number): Promise<PayrollReimbursement[]> {
  return result(await fetch(`/api/admin/finance/payroll/${id}/reimbursements`, { cache: "no-store" }));
}

export async function getPayrollSettings(): Promise<PayrollSettings> {
  return result(await fetch("/api/admin/finance/payroll/settings", { cache: "no-store" }));
}
