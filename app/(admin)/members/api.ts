import type { MemberDetail, MemberGrowth, MemberListResult, MemberStats, ProductDistribution } from "./types";

export class MembersApiError extends Error {}

async function result<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new MembersApiError(body.detail ?? "Permintaan gagal. Silakan coba lagi.");
  return body as T;
}

export async function getStats(year: number, month: number): Promise<MemberStats> {
  return result(await fetch(`/api/admin/members/stats?year=${year}&month=${month}`, { cache: "no-store" }));
}

export async function getGrowth(year: number): Promise<MemberGrowth> {
  return result(await fetch(`/api/admin/members/growth?year=${year}`, { cache: "no-store" }));
}

export async function getProductDistribution(): Promise<ProductDistribution> {
  return result(await fetch("/api/admin/members/product-distribution", { cache: "no-store" }));
}

export async function listMembers(params: {
  page: number; pageSize: number; search?: string; product?: string | null; status?: string | null;
  sort?: string; signal?: AbortSignal;
}): Promise<MemberListResult> {
  const query = new URLSearchParams({ page: String(params.page), page_size: String(params.pageSize) });
  if (params.search) query.set("search", params.search);
  if (params.product && params.product !== "All products") query.set("product", params.product);
  if (params.status && params.status !== "All status") query.set("status", params.status);
  if (params.sort) query.set("sort", params.sort);
  return result(await fetch(`/api/admin/members?${query}`, { cache: "no-store", signal: params.signal }));
}

export async function getMemberDetail(id: string): Promise<MemberDetail> {
  return result(await fetch(`/api/admin/members/${id}`, { cache: "no-store" }));
}

export async function getMemberStudyClassHistory(id: string, page: number, signal?: AbortSignal): Promise<import("./types").MemberStudyClassHistory> {
  const query = new URLSearchParams({ page: String(page), page_size: "10" });
  return result(await fetch(`/api/admin/members/${encodeURIComponent(id)}/studynao-classes?${query}`, { cache: "no-store", signal }));
}

export async function getStudentProvinceOptions(signal?: AbortSignal): Promise<string[]> {
  const body = await result<unknown>(await fetch("/api/provinces", { cache: "no-store", signal }));
  const rows = Array.isArray(body) ? body : body && typeof body === "object" && "data" in body && Array.isArray(body.data) ? body.data : [];
  return rows.map((row: unknown) => typeof row === "string" ? row : row && typeof row === "object" && "name" in row ? String(row.name) : "").filter(Boolean);
}
