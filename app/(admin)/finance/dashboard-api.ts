import type { DashboardData } from "./dashboard-types";

export class DashboardApiError extends Error {}

export async function getDashboard(): Promise<DashboardData> {
  const response = await fetch("/api/admin/finance/dashboard", { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new DashboardApiError(body.detail ?? "Request failed. Please try again.");
  return body as DashboardData;
}
