"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Group, MultiSelect, NumberInput, Select, SimpleGrid, Stack, Switch, Table, Tabs, Text, TextInput, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { PageHeader } from "@/components/ui/admin";

type Subject = { id: number; name: string; class_code: string; teaching_language: "English" | "Chinese"; active: boolean };
type Program = { id: number; code: string; subject: string; program: string; class_type: string; teaching_language: string; session_count: number; duration_minutes: number; teacher_rate_per_session: number; active: boolean; subject_ids: number[]; pending_teacher_rate_per_session?: number | null; pending_effective_from?: string | null };
type Teacher = { user_id: string; user: { full_name: string; email: string } | null; profile: { whatsapp: string; province: string; class_types: string[]; teaching_languages: string[]; hsk_level: number | null; birth_date: string; marital_status: string; bank_name: string; bank_account_number: string; bank_account_name: string } | null; subject_ids: number[] };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin/studynao${path}`, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail ?? "Permintaan gagal.");
  return data as T;
}
const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function StudyNaoAdminPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectEditing, setSubjectEditing] = useState<Subject | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [editing, setEditing] = useState<Program | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const [catalog, pending] = await Promise.all([api<{ items: Program[]; subjects: Subject[] }>("/programs"), api<{ items: Teacher[] }>("/teachers/pending")]);
      setPrograms(catalog.items); setSubjects(catalog.subjects); setTeachers(pending.items); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Data belum dapat dimuat."); }
  };
  useEffect(() => { void Promise.resolve().then(load); }, []);
  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      await api(`/programs/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject: editing.subject, subject_ids: editing.subject_ids, session_count: editing.session_count, duration_minutes: editing.duration_minutes, teacher_rate_per_session: editing.teacher_rate_per_session, active: editing.active }) });
      notifications.show({ color: "green", message: "Konfigurasi program tersimpan. Kenaikan atau perubahan gaji berlaku mulai bulan depan." });
      setEditing(null); await load();
    } catch (cause) { notifications.show({ color: "red", message: cause instanceof Error ? cause.message : "Gagal menyimpan." }); }
    finally { setBusy(false); }
  }
  async function saveSubject() {
    if (!subjectEditing) return;
    setBusy(true);
    try {
      await api(subjectEditing.id ? `/subjects/${subjectEditing.id}` : "/subjects", { method: subjectEditing.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: subjectEditing.name, class_code: subjectEditing.class_code, teaching_language: subjectEditing.teaching_language, active: subjectEditing.active }) });
      setSubjectEditing(null); await load(); notifications.show({ color: "green", message: "Mata pelajaran tersimpan." });
    } catch (cause) { notifications.show({ color: "red", message: cause instanceof Error ? cause.message : "Gagal menyimpan mata pelajaran." }); }
    finally { setBusy(false); }
  }
  async function decide(userId: string, approve: boolean) {
    setBusy(true);
    try {
      await api(`/teachers/${encodeURIComponent(userId)}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approve }) });
      notifications.show({ color: "green", message: approve ? "Guru terverifikasi dan terhubung ke direktori karyawan." : "Pengajuan guru ditolak." });
      await load();
    } catch (cause) { notifications.show({ color: "red", message: cause instanceof Error ? cause.message : "Gagal memproses." }); }
    finally { setBusy(false); }
  }
  return <Stack gap="lg">
    <PageHeader eyebrow="StudyNao" title="Konfigurasi & verifikasi" description="Kelola durasi, jumlah sesi, gaji guru, serta akses pengajar baru." />
    {error && <Card withBorder><Text c="red" role="alert">{error}</Text><Button variant="light" mt="sm" onClick={() => void load()}>Coba lagi</Button></Card>}
    <Tabs defaultValue="programs"><Tabs.List><Tabs.Tab value="programs">Program & gaji</Tabs.Tab><Tabs.Tab value="teachers">Verifikasi guru <Badge ml={6} size="sm">{teachers.length}</Badge></Tabs.Tab></Tabs.List>
      <Tabs.Panel value="programs" pt="lg"><Card withBorder radius="md" p="lg" mb="lg"><Group justify="space-between" mb="md"><Title order={2} size="h4">Mata pelajaran</Title><Button variant="light" onClick={() => setSubjectEditing({ id: 0, name: "", class_code: "", teaching_language: "Chinese", active: true })}>Tambah subjek</Button></Group><Group gap="xs">{subjects.map((subject) => <Button key={subject.id} size="xs" variant="outline" color={subject.active ? "gold" : "gray"} onClick={() => setSubjectEditing({ ...subject })}>{subject.name}{!subject.active ? " · Nonaktif" : ""}</Button>)}</Group>{subjectEditing && <Group mt="lg" align="end"><TextInput label="Nama mata pelajaran" required value={subjectEditing.name} onChange={(event) => setSubjectEditing({ ...subjectEditing, name: event.currentTarget.value })} /><TextInput label="Kode kelas" description="Dua huruf untuk CSCA (mis. MT/PH), atau level HSK 01–06." required disabled={subjectEditing.id > 0} maxLength={2} value={subjectEditing.class_code} onChange={(event) => setSubjectEditing({ ...subjectEditing, class_code: event.currentTarget.value.toUpperCase() })} /><Select label="Bahasa ajar" data={["English", "Chinese"]} disabled={subjectEditing.id > 0} value={subjectEditing.teaching_language} onChange={(value) => setSubjectEditing({ ...subjectEditing, teaching_language: (value ?? "Chinese") as "English" | "Chinese" })} /><Switch label="Aktif" checked={subjectEditing.active} onChange={(event) => setSubjectEditing({ ...subjectEditing, active: event.currentTarget.checked })} /><Button loading={busy} onClick={() => void saveSubject()}>Simpan subjek</Button><Button variant="subtle" onClick={() => setSubjectEditing(null)}>Batal</Button></Group>}</Card><Card withBorder radius="md" p="lg"><Text size="sm" c="dimmed" mb="md">Tarif murid belum dikonfigurasi. Perubahan gaji guru berlaku mulai bulan berikutnya dan tercatat sebagai revisi.</Text><Table.ScrollContainer minWidth={820}><Table striped highlightOnHover><Table.Thead><Table.Tr><Table.Th>Program</Table.Th><Table.Th>Tipe</Table.Th><Table.Th>Bahasa</Table.Th><Table.Th>Sesi</Table.Th><Table.Th>Durasi</Table.Th><Table.Th>Gaji guru/sesi</Table.Th><Table.Th>Status</Table.Th><Table.Th /></Table.Tr></Table.Thead><Table.Tbody>{programs.map((item) => <Table.Tr key={item.id}><Table.Td><Text fw={600}>{item.subject}</Text><Text size="xs" c="dimmed">{item.code}</Text></Table.Td><Table.Td>{item.class_type === "private" ? "Privat" : "Grup"}</Table.Td><Table.Td>{item.teaching_language}</Table.Td><Table.Td>{item.session_count}</Table.Td><Table.Td>{item.duration_minutes} menit</Table.Td><Table.Td>{rupiah(item.teacher_rate_per_session)}{item.pending_teacher_rate_per_session != null && <Text size="xs" c="dimmed">Mulai {item.pending_effective_from}: {rupiah(item.pending_teacher_rate_per_session)}</Text>}</Table.Td><Table.Td><Badge color={item.active ? "green" : "gray"}>{item.active ? "Aktif" : "Nonaktif"}</Badge></Table.Td><Table.Td><Button size="xs" variant="light" onClick={() => setEditing({ ...item })}>Edit</Button></Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer></Card>
        {editing && <Card withBorder radius="md" p="lg" mt="lg"><Title order={2} size="h4" mb="md">Edit {editing.code}</Title><SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}><TextInput label="Nama program" required value={editing.subject} onChange={(event) => setEditing({ ...editing, subject: event.currentTarget.value })} /><NumberInput label="Jumlah sesi" min={1} required value={editing.session_count} onChange={(value) => setEditing({ ...editing, session_count: Number(value) || 0 })} /><Select label="Durasi per sesi" required data={["45", "60", "75", "90", "105", "120", "135", "150", "180"]} value={String(editing.duration_minutes)} onChange={(value) => setEditing({ ...editing, duration_minutes: Number(value) })} /><NumberInput label="Gaji guru per sesi (Rp)" min={0} required thousandSeparator="." value={editing.teacher_rate_per_session} onChange={(value) => setEditing({ ...editing, teacher_rate_per_session: Number(value) || 0 })} /></SimpleGrid><MultiSelect mt="md" label="Mata pelajaran" data={subjects.filter((item) => item.teaching_language === editing.teaching_language).map((item) => ({ value: String(item.id), label: item.name }))} value={editing.subject_ids.map(String)} onChange={(values) => setEditing({ ...editing, subject_ids: values.map(Number) })} required /><Switch mt="md" label="Program aktif" checked={editing.active} onChange={(event) => setEditing({ ...editing, active: event.currentTarget.checked })} /><Group justify="flex-end" mt="lg"><Button variant="default" onClick={() => setEditing(null)}>Batal</Button><Button loading={busy} onClick={() => void save()}>Simpan</Button></Group></Card>}
      </Tabs.Panel>
      <Tabs.Panel value="teachers" pt="lg"><Stack>{teachers.length === 0 && <Card withBorder><Text c="dimmed">Tidak ada guru yang menunggu verifikasi.</Text></Card>}{teachers.map((teacher) => <Card key={teacher.user_id} withBorder p="lg"><Group justify="space-between" align="flex-start"><Stack gap={4}><Text fw={700}>{teacher.user?.full_name ?? teacher.user_id}</Text><Text size="sm" c="dimmed">{teacher.user?.email} · {teacher.profile?.whatsapp}</Text><Text size="sm">{teacher.profile?.province} · {teacher.profile?.class_types.join(", ")} · {teacher.profile?.teaching_languages.join(", ")} {teacher.profile?.hsk_level ? `· HSK ${teacher.profile.hsk_level}` : ""}</Text><Text size="xs" c="dimmed">Lahir: {teacher.profile?.birth_date} · Status pernikahan: {teacher.profile?.marital_status === "married" ? "Menikah" : "Belum menikah"} · Bank: {teacher.profile?.bank_name} / {teacher.profile?.bank_account_name} / {teacher.profile?.bank_account_number}</Text><Text size="xs" c="dimmed">Mata pelajaran: {teacher.subject_ids.map((id) => subjects.find((subject) => subject.id === id)?.name ?? id).join(", ")}</Text></Stack><Group><Button variant="light" color="red" disabled={busy} onClick={() => void decide(teacher.user_id, false)}>Tolak</Button><Button disabled={busy} onClick={() => void decide(teacher.user_id, true)}>Verifikasi guru</Button></Group></Group></Card>)}</Stack></Tabs.Panel>
    </Tabs>
  </Stack>;
}
