import type { DokuFeeRow, DokuFeeWritePayload } from "./types";

export class DokuFeeApiError extends Error {}

async function result<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new DokuFeeApiError(body.detail ?? "Permintaan gagal. Silakan coba lagi.");
  return body as T;
}

export async function listDokuFees(): Promise<DokuFeeRow[]> {
  return result(await fetch("/api/admin/finance/doku-fees", { cache: "no-store" }));
}

export async function updateDokuFee(id: number, payload: DokuFeeWritePayload): Promise<DokuFeeRow> {
  return result(await fetch(`/api/admin/finance/doku-fees/${id}`, {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
  }));
}
