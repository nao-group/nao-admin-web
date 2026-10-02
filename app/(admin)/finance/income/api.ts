import type {
  DokuFeeOption, IncomeListParams, IncomeListResult, IncomeOverview, IncomeRow, IncomeWritePayload, InvoiceBrand,
} from "./types";

export class IncomeApiError extends Error {}

async function result<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new IncomeApiError(body.detail ?? "Request failed. Please try again.");
  return body as T;
}

function buildQuery(params: IncomeListParams): URLSearchParams {
  const query = new URLSearchParams({ page: String(params.page), page_size: String(params.page_size) });
  if (params.search) query.set("search", params.search);
  if (params.source) query.set("source", params.source);
  if (params.status) query.set("status", params.status);
  if (params.date_from) query.set("date_from", params.date_from);
  if (params.date_to) query.set("date_to", params.date_to);
  if (params.sort) query.set("sort", params.sort);
  return query;
}

export async function listIncomes(params: IncomeListParams): Promise<IncomeListResult> {
  return result(await fetch(`/api/admin/finance/income?${buildQuery(params)}`, { cache: "no-store" }));
}

export async function getIncomeOverview(params: Omit<IncomeListParams, "page" | "page_size" | "sort">): Promise<IncomeOverview> {
  const query = buildQuery({ ...params, page: 1, page_size: 1 });
  query.delete("page");
  query.delete("page_size");
  return result(await fetch(`/api/admin/finance/income/overview?${query}`, { cache: "no-store" }));
}

export function incomeExportUrl(params: Omit<IncomeListParams, "page" | "page_size" | "sort">): string {
  const query = buildQuery({ ...params, page: 1, page_size: 1 });
  query.delete("page");
  query.delete("page_size");
  return `/api/admin/finance/income/export?${query}`;
}

export async function createIncome(payload: IncomeWritePayload): Promise<IncomeRow> {
  return result(await fetch("/api/admin/finance/income", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
  }));
}

export async function updateIncome(id: number, payload: IncomeWritePayload): Promise<IncomeRow> {
  return result(await fetch(`/api/admin/finance/income/${id}`, {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
  }));
}

export async function updateIncomeStatus(id: number, status: IncomeRow["status"]): Promise<IncomeRow> {
  return result(await fetch(`/api/admin/finance/income/${id}/status`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }),
  }));
}

export async function adjustIncomeFee(id: number, feeAmount: number): Promise<IncomeRow> {
  return result(await fetch(`/api/admin/finance/income/${id}/fee`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ fee_amount: feeAmount }),
  }));
}

export async function listDokuFees(): Promise<DokuFeeOption[]> {
  return result(await fetch("/api/admin/finance/doku-fees", { cache: "no-store" }));
}

export async function uploadIncomeInvoice(id: number, file: File): Promise<IncomeRow> {
  const form = new FormData();
  form.set("file", file);
  return result(await fetch(`/api/admin/finance/income/${id}/invoice`, { method: "POST", body: form }));
}

export function incomeInvoiceViewUrl(id: number): string {
  return `/api/admin/finance/income/${id}/invoice`;
}

/** Renders an invoice PDF on the backend and attaches it to the income, replacing any attached file. */
export async function generateIncomeInvoice(id: number, brand: InvoiceBrand): Promise<IncomeRow> {
  return result(await fetch(`/api/admin/finance/income/${id}/invoice/generate`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ brand }),
  }));
}

export async function deleteIncome(id: number): Promise<void> {
  await result(await fetch(`/api/admin/finance/income/${id}`, { method: "DELETE" }));
}
