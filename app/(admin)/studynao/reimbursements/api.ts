import type { Reimbursement, ReimbursementList } from "./types";
async function api<T>(path: string, init?: RequestInit): Promise<T> {
 const response = await fetch(`/api/admin/studynao${path}`, { ...init, cache: "no-store" });
 const data = await response.json().catch(() => ({}));
 if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Permintaan gagal.");
 return data;
}
export const getPurchaseSettings = () => api<{ zoom_shopee_url: string | null }>("/purchase-settings");
export const savePurchaseSettings = (url: string) => api("/purchase-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zoom_shopee_url: url }) });
export const getReimbursements = (page: number, status: string) => api<ReimbursementList>(`/reimbursements?page=${page}&page_size=10${status ? `&status=${status}` : ""}`);
export const reviewReimbursement = (id: number, approve: boolean, review_note: string) => api<Reimbursement>(`/reimbursements/${id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approve, review_note }) });
