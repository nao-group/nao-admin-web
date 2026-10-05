import type { MatchResponse, Overview, Slot } from "./types";

async function schedulingApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin/studynao/scheduling${path}`, { ...init, cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail ?? "Data penjadwalan belum dapat dimuat.");
  return body as T;
}

export function getOverlapData(requestId: number) {
  return Promise.all([
    schedulingApi<MatchResponse>(`/private-requests/${requestId}/matches`),
    schedulingApi<Overview>(""),
  ]);
}

export function getMatchesForDate(requestId: number, firstDate: string) {
  return schedulingApi<MatchResponse>(`/private-requests/${requestId}/matches?first_date=${encodeURIComponent(firstDate)}`);
}

export function finalizePrivateClass(data: { request_id: number; program_id: number; offering_id: number; teacher_staff_id: number; first_date: string; slots: Slot[] }) {
  return schedulingApi("/classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, slots: data.slots.map(({ weekday, start_minute, end_minute }) => ({ weekday, start_minute, end_minute })), capacity: 1 }) });
}
