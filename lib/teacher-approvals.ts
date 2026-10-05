export type PendingTeacher = {
  user_id: string;
  created_at: string;
  user: { full_name: string; email: string } | null;
  profile: {
    whatsapp: string; province: string; class_types: string[]; teaching_languages: string[];
    hsk_level: number | null; birth_date: string; marital_status: string;
    bank_name: string; bank_account_number: string; bank_account_name: string; photo_url?: string | null;
  } | null;
  subject_ids: number[];
};

async function read<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { detail?: string }).detail ?? "Permintaan gagal.");
  return body as T;
}

export async function listPendingTeachers(): Promise<PendingTeacher[]> {
  const page = await read<{ items: PendingTeacher[] }>(await fetch("/api/admin/studynao/teachers/pending", { cache: "no-store" }));
  return page.items;
}

export async function decideTeacher(userId: string, approve: boolean): Promise<{ status: string; email_sent: boolean }> {
  return read(await fetch(`/api/admin/studynao/teachers/${encodeURIComponent(userId)}/decision`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approve }),
  }));
}

export const ADMIN_NOTIFICATIONS_REFRESH = "admin-notifications-refresh";
export function refreshAdminNotifications() {
  window.dispatchEvent(new Event(ADMIN_NOTIFICATIONS_REFRESH));
}
