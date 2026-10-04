import { listPendingTeachers } from "@/lib/teacher-approvals";

export type AdminNotification = {
  id: string;
  kind: "teacher_approval" | "scheduling";
  title: string;
  description: string;
  href: string;
  createdAt: string;
};

// Additional actionable sources, such as scheduling, can be merged here.
export async function listAdminNotifications(): Promise<AdminNotification[]> {
  const [teachers, schedulingResponse] = await Promise.all([
    listPendingTeachers(),
    fetch("/api/admin/studynao/scheduling", { cache: "no-store" }),
  ]);
  const scheduling = schedulingResponse.ok ? await schedulingResponse.json() as { requests: { id: number; student?: { full_name?: string } }[] } : { requests: [] };
  return [...teachers.map((teacher) => ({
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
  }))].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
