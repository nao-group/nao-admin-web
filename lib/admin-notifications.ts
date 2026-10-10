import { listPendingTeachers } from "@/lib/teacher-approvals";

export type AdminNotification = {
  id: string;
  kind: "teacher_approval" | "scheduling" | "reimbursement";
  title: string;
  description: string;
  href: string;
  createdAt: string;
};

type ReimbursementSummary = {
  pending_count: number;
  latest: { id: number; created_at: string; requester?: { full_name: string } | null; staff_members: { full_name: string } | null } | null;
};
async function readSource<T>(path: string, fallback: T): Promise<T> {
  const response = await fetch(path, { cache: "no-store" });
  return response.ok ? await response.json() as T : fallback;
}

export async function listAdminNotifications(): Promise<AdminNotification[]> {
  // Each source loads independently, including when an admin lacks finance access.
  const [teacherResult, schedulingResult, reimbursementResult] = await Promise.allSettled([
    listPendingTeachers(),
    readSource<{ requests: { id: number; student?: { full_name?: string } }[] }>("/api/admin/studynao/scheduling", { requests: [] }),
    readSource<ReimbursementSummary>("/api/admin/reimbursements/summary", { pending_count: 0, latest: null }),
  ]);
  const teachers = teacherResult.status === "fulfilled" ? teacherResult.value : [];
  const scheduling = schedulingResult.status === "fulfilled" ? schedulingResult.value : { requests: [] };
  const reimbursements = reimbursementResult.status === "fulfilled" ? reimbursementResult.value : { pending_count: 0, latest: null };
  const items: AdminNotification[] = [...teachers.map((teacher) => ({
    id: `teacher-approval:${teacher.user_id}`,
    kind: "teacher_approval" as const,
    title: "Persetujuan guru diperlukan",
    description: `${teacher.user?.full_name ?? "Guru baru"} menunggu verifikasi.`,
    href: "/staff#pending-teachers",
    createdAt: teacher.created_at,
  })), ...scheduling.requests.map((request) => ({
    id: `class-request:${request.id}`,
    kind: "scheduling" as const,
    title: "Penjadwalan kelas diperlukan",
    description: `${request.student?.full_name ?? "Murid"} menunggu jadwal kelas.`,
    href: "/studynao/scheduling",
    createdAt: "",
  }))];
  if (reimbursements.pending_count > 0 && reimbursements.latest) {
    items.push({
      id: "reimbursements:pending",
      kind: "reimbursement",
      title: "Reimbursement menunggu review",
      description: `${reimbursements.pending_count} pengajuan menunggu. Terbaru dari ${reimbursements.latest.requester?.full_name ?? reimbursements.latest.staff_members?.full_name ?? "pemohon"}.`,
      href: "/finance/reimbursements",
      createdAt: reimbursements.latest.created_at,
    });
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
