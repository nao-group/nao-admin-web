import type { ExpenseListParams, ExpenseListResult, ExpenseOverview, ExpenseRow, ExpenseWritePayload } from "./types";

export class ExpenseApiError extends Error {}

async function result<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ExpenseApiError(body.detail ?? "Request failed. Please try again.");
  return body as T;
}

function buildQuery(params: ExpenseListParams): URLSearchParams {
  const query = new URLSearchParams({ page: String(params.page), page_size: String(params.page_size) });
  if (params.search) query.set("search", params.search);
  if (params.category) query.set("category", params.category);
  if (params.status) query.set("status", params.status);
  if (params.date_from) query.set("date_from", params.date_from);
  if (params.date_to) query.set("date_to", params.date_to);
  if (params.sort) query.set("sort", params.sort);
  return query;
}

export async function listExpenses(params: ExpenseListParams): Promise<ExpenseListResult> {
  return result(await fetch(`/api/admin/finance/expenses?${buildQuery(params)}`, { cache: "no-store" }));
}

export async function getExpenseOverview(params: Omit<ExpenseListParams, "page" | "page_size" | "sort">): Promise<ExpenseOverview> {
  const query = buildQuery({ ...params, page: 1, page_size: 1 });
  query.delete("page");
  query.delete("page_size");
  return result(await fetch(`/api/admin/finance/expenses/overview?${query}`, { cache: "no-store" }));
}

export function expenseExportUrl(params: Omit<ExpenseListParams, "page" | "page_size" | "sort">): string {
  const query = buildQuery({ ...params, page: 1, page_size: 1 });
  query.delete("page");
  query.delete("page_size");
  return `/api/admin/finance/expenses/export?${query}`;
}

export async function createExpense(payload: ExpenseWritePayload): Promise<ExpenseRow> {
  return result(await fetch("/api/admin/finance/expenses", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
  }));
}

export async function updateExpense(id: number, payload: ExpenseWritePayload): Promise<ExpenseRow> {
  return result(await fetch(`/api/admin/finance/expenses/${id}`, {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
  }));
}

export async function updateExpenseStatus(id: number, status: ExpenseRow["status"]): Promise<ExpenseRow> {
  return result(await fetch(`/api/admin/finance/expenses/${id}/status`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }),
  }));
}

export async function uploadExpenseEvidence(id: number, file: File): Promise<ExpenseRow> {
  const form = new FormData();
  form.set("file", file);
  return result(await fetch(`/api/admin/finance/expenses/${id}/evidence`, { method: "POST", body: form }));
}

export function expenseEvidenceViewUrl(id: number): string {
  return `/api/admin/finance/expenses/${id}/evidence`;
}

export async function deleteExpense(id: number): Promise<void> {
  await result(await fetch(`/api/admin/finance/expenses/${id}`, { method: "DELETE" }));
}
