"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar, Badge, Box, Button, Card, Group, Modal, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconUserX } from "@tabler/icons-react";
import { decideTeacher, listPendingTeachers, refreshAdminNotifications, type PendingTeacher } from "@/lib/teacher-approvals";

type Subject = { id: number; name: string };

export function PendingTeachers({ onDecision }: { onDecision?: () => void }) {
  const [teachers, setTeachers] = useState<PendingTeacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deciding, setDeciding] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<PendingTeacher | null>(null);

  const load = useCallback(async () => {
    try {
      const [pending, catalog] = await Promise.all([
        listPendingTeachers(),
        fetch("/api/admin/studynao/programs", { cache: "no-store" }).then(async (response) => {
          if (!response.ok) throw new Error("Mata pelajaran gagal dimuat.");
          return response.json() as Promise<{ subjects: Subject[] }>;
        }),
      ]);
      setTeachers(pending); setSubjects(catalog.subjects); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Pengajuan guru gagal dimuat."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function decide(teacher: PendingTeacher, approve: boolean) {
    setDeciding(teacher.user_id);
    try {
      const result = await decideTeacher(teacher.user_id, approve);
      setTeachers((items) => items.filter((item) => item.user_id !== teacher.user_id));
      setRejecting(null);
      refreshAdminNotifications();
      onDecision?.();
      notifications.show({
        color: result.email_sent ? "teal" : "yellow",
        title: approve ? "Guru disetujui" : "Guru ditolak",
        message: result.email_sent ? "Guru sudah diberi tahu melalui email." : "Status tersimpan, tetapi email gagal dikirim. Hubungi guru secara langsung.",
      });
    } catch (cause) { notifications.show({ color: "red", title: "Keputusan gagal disimpan", message: cause instanceof Error ? cause.message : "Coba lagi." }); }
    finally { setDeciding(null); }
  }

  return <Card id="pending-teachers" className="surface-card" p="lg" mb="lg" style={{ scrollMarginTop: 90 }}>
    <Group justify="space-between" mb="md"><Box><Group gap="sm"><Text className="section-title">Persetujuan guru</Text><Badge color="yellow" variant="light">{teachers.length} menunggu</Badge></Group><Text size="xs" c="dimmed">Verifikasi guru baru StudyNao sebelum mereka mendapat akses mengajar.</Text></Box><Button variant="subtle" size="xs" onClick={() => void load()}>Muat ulang</Button></Group>
    {error && <Text role="alert" size="sm" c="red" mb="sm">{error}</Text>}
    {loading ? <Text size="sm" c="dimmed">Memuat pengajuan…</Text> : teachers.length === 0 ? <Text size="sm" c="dimmed">Tidak ada guru yang menunggu persetujuan.</Text> : <Stack gap="sm">{teachers.map((teacher) => {
      const profile = teacher.profile;
      const name = teacher.user?.full_name ?? teacher.user_id;
      return <Card key={teacher.user_id} withBorder radius="md" p="md"><Group justify="space-between" align="flex-start" gap="lg"><Avatar src={profile?.photo_url} alt={`Foto ${name}`} size={62} radius="xl" color="yellow">{name.slice(0, 1)}</Avatar><Stack gap={5} style={{ flex: 1 }}>
        <Group gap="xs"><Text fw={700}>{name}</Text><Badge size="xs" color="yellow">Menunggu</Badge></Group>
        <Text size="sm" c="dimmed">{teacher.user?.email ?? "Email tidak ada"} · {profile?.whatsapp ?? "WhatsApp tidak ada"}</Text>
        <Text size="sm">Mata pelajaran: {teacher.subject_ids.map((id) => subjects.find((subject) => subject.id === id)?.name ?? `#${id}`).join(", ") || "—"}</Text>
        <Text size="sm">Tipe kelas: {profile?.class_types?.join(", ") || "—"} · Bahasa: {profile?.teaching_languages?.join(", ") || "—"}{profile?.hsk_level ? ` · HSK ${profile.hsk_level}` : ""}</Text>
        <Text size="xs" c="dimmed">{profile?.province || "—"} · Lahir {profile?.birth_date || "—"} · {profile?.marital_status === "married" ? "Menikah" : "Belum menikah"}</Text>
        <Text size="xs" c="dimmed">Bank: {profile?.bank_name || "—"} · {profile?.bank_account_name || "—"} · •••• {profile?.bank_account_number?.slice(-4) || "—"}</Text>
        <Text size="xs" c="dimmed">Diajukan {teacher.created_at ? new Date(teacher.created_at).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" }) : "—"}</Text>
      </Stack><Group gap="xs"><Button variant="light" color="red" leftSection={<IconUserX size={16} />} disabled={Boolean(deciding)} onClick={() => setRejecting(teacher)}>Tolak</Button><Button className="primary-action" leftSection={<IconCheck size={16} />} loading={deciding === teacher.user_id} disabled={Boolean(deciding) || !profile || !teacher.user?.email} onClick={() => void decide(teacher, true)}>Setujui</Button></Group></Group></Card>;
    })}</Stack>}
    <Modal opened={Boolean(rejecting)} onClose={() => setRejecting(null)} title="Tolak pengajuan guru?" centered><Text size="sm">{rejecting?.user?.full_name ?? "Guru ini"} tidak akan mendapat akses mengajar. Guru akan menerima email tentang keputusan ini.</Text><Group justify="flex-end" mt="lg"><Button variant="default" onClick={() => setRejecting(null)}>Batal</Button><Button color="red" loading={Boolean(deciding)} onClick={() => { if (rejecting) void decide(rejecting, false); }}>Tolak pengajuan</Button></Group></Modal>
  </Card>;
}
