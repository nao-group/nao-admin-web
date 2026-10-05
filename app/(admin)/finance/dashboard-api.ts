import type { DashboardData } from "./dashboard-types";

export class DashboardApiError extends Error {}

export async function getDashboard(): Promise<DashboardData> {
  const response = await fetch("/api/admin/finance/dashboard", { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new DashboardApiError(body.detail ?? "Permintaan gagal. Silakan coba lagi.");
  return body as DashboardData;
}
