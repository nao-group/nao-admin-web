import type { AutoExpenseRuleRow, AutoExpenseRuleWritePayload } from "./types";

export class AutoExpenseApiError extends Error {}

async function result<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new AutoExpenseApiError(body.detail ?? "Request failed. Please try again.");
  return body as T;
}

export async function listAutoExpenseRules(): Promise<AutoExpenseRuleRow[]> {
  return result(await fetch("/api/admin/finance/auto-expense-rules", { cache: "no-store" }));
}

export async function createAutoExpenseRule(payload: AutoExpenseRuleWritePayload): Promise<AutoExpenseRuleRow> {
  return result(await fetch("/api/admin/finance/auto-expense-rules", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
  }));
}

export async function updateAutoExpenseRule(id: number, payload: AutoExpenseRuleWritePayload): Promise<AutoExpenseRuleRow> {
  return result(await fetch(`/api/admin/finance/auto-expense-rules/${id}`, {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
  }));
}

export async function setAutoExpenseRuleActive(id: number, active: boolean): Promise<AutoExpenseRuleRow> {
  return result(await fetch(`/api/admin/finance/auto-expense-rules/${id}/active`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ active }),
  }));
}

export async function deleteAutoExpenseRule(id: number): Promise<void> {
  await result(await fetch(`/api/admin/finance/auto-expense-rules/${id}`, { method: "DELETE" }));
}

export async function runAutoExpenseRulesNow(): Promise<{ created: number }> {
  return result(await fetch("/api/admin/finance/auto-expense-rules/run", { method: "POST" }));
}
