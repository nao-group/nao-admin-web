import type { MemberDetail, MemberGrowth, MemberListResult, MemberStats, ProductDistribution } from "./types";

export class MembersApiError extends Error {}

async function result<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new MembersApiError(body.detail ?? "Request failed. Please try again.");
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
}): Promise<MemberListResult> {
  const query = new URLSearchParams({ page: String(params.page), page_size: String(params.pageSize) });
  if (params.search) query.set("search", params.search);
  if (params.product && params.product !== "All products") query.set("product", params.product);
  if (params.status && params.status !== "All status") query.set("status", params.status);
  return result(await fetch(`/api/admin/members?${query}`, { cache: "no-store" }));
}

export async function getMemberDetail(id: string): Promise<MemberDetail> {
  return result(await fetch(`/api/admin/members/${id}`, { cache: "no-store" }));
}
