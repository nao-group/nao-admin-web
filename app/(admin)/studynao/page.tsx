"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Group, Modal, MultiSelect, NumberInput, Select, SimpleGrid, Stack, Switch, Table, Text, TextInput, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { PageHeader } from "@/components/ui/admin";

import { ZoomPurchaseSettings } from "./reimbursements/components/ZoomPurchaseSettings";

type Subject = { id: number; name: string; class_code: string; teaching_language: "English" | "Chinese"; active: boolean };
type Program = { id: number; code: string; subject: string; program: string; class_type: string; teaching_language: string; session_count: number; duration_minutes: number; teacher_rate_per_session: number; active: boolean; subject_ids: number[]; pending_teacher_rate_per_session?: number | null; pending_effective_from?: string | null };

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
  const [editing, setEditing] = useState<Program | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const catalog = await api<{ items: Program[]; subjects: Subject[] }>("/programs");
      setPrograms(catalog.items); setSubjects(catalog.subjects); setError("");
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
  return <Stack gap="lg">
    <PageHeader eyebrow="StudyNao" title="Konfigurasi" description="Kelola durasi, jumlah sesi, dan gaji guru StudyNao." />
    <ZoomPurchaseSettings />
    {error && <Card withBorder><Text c="red" role="alert">{error}</Text><Button variant="light" mt="sm" onClick={() => void load()}>Coba lagi</Button></Card>}
    <Card withBorder radius="md" p="lg" mb="lg"><Group justify="space-between" mb="md"><Title order={2} size="h4">Mata pelajaran</Title><Button variant="light" onClick={() => setSubjectEditing({ id: 0, name: "", class_code: "", teaching_language: "Chinese", active: true })}>Tambah subjek</Button></Group><Group gap="xs">{subjects.map((subject) => <Button key={subject.id} size="xs" variant="outline" color={subject.active ? "gold" : "gray"} onClick={() => setSubjectEditing({ ...subject })}>{subject.name}{!subject.active ? " · Nonaktif" : ""}</Button>)}</Group>{subjectEditing && <Group mt="lg" align="end"><TextInput label="Nama mata pelajaran" required value={subjectEditing.name} onChange={(event) => setSubjectEditing({ ...subjectEditing, name: event.currentTarget.value })} /><TextInput label="Kode kelas" description="Dua huruf untuk CSCA (mis. MT/PH), atau level HSK 01–06." required disabled={subjectEditing.id > 0} maxLength={2} value={subjectEditing.class_code} onChange={(event) => setSubjectEditing({ ...subjectEditing, class_code: event.currentTarget.value.toUpperCase() })} /><Select label="Bahasa ajar" data={["English", "Chinese"]} disabled={subjectEditing.id > 0} value={subjectEditing.teaching_language} onChange={(value) => setSubjectEditing({ ...subjectEditing, teaching_language: (value ?? "Chinese") as "English" | "Chinese" })} /><Switch label="Aktif" checked={subjectEditing.active} onChange={(event) => setSubjectEditing({ ...subjectEditing, active: event.currentTarget.checked })} /><Button loading={busy} onClick={() => void saveSubject()}>Simpan subjek</Button><Button variant="subtle" onClick={() => setSubjectEditing(null)}>Batal</Button></Group>}</Card><Card withBorder radius="md" p="lg"><Text size="sm" c="dimmed" mb="md">Tarif murid belum dikonfigurasi. Perubahan gaji guru berlaku mulai bulan berikutnya dan tercatat sebagai revisi.</Text><Table.ScrollContainer minWidth={820}><Table striped highlightOnHover><Table.Thead><Table.Tr><Table.Th>Program</Table.Th><Table.Th>Tipe</Table.Th><Table.Th>Bahasa</Table.Th><Table.Th>Sesi</Table.Th><Table.Th>Durasi</Table.Th><Table.Th>Gaji guru/sesi</Table.Th><Table.Th>Status</Table.Th><Table.Th /></Table.Tr></Table.Thead><Table.Tbody>{programs.map((item) => <Table.Tr key={item.id}><Table.Td><Text fw={600}>{item.subject}</Text><Text size="xs" c="dimmed">{item.code}</Text></Table.Td><Table.Td>{item.class_type === "private" ? "Privat" : "Grup"}</Table.Td><Table.Td>{item.teaching_language}</Table.Td><Table.Td>{item.session_count}</Table.Td><Table.Td>{item.duration_minutes} menit</Table.Td><Table.Td>{rupiah(item.teacher_rate_per_session)}{item.pending_teacher_rate_per_session != null && <Text size="xs" c="dimmed">Mulai {item.pending_effective_from}: {rupiah(item.pending_teacher_rate_per_session)}</Text>}</Table.Td><Table.Td><Badge color={item.active ? "green" : "gray"}>{item.active ? "Aktif" : "Nonaktif"}</Badge></Table.Td><Table.Td><Button size="xs" variant="light" onClick={() => setEditing({ ...item })}>Edit</Button></Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer></Card>
    <Modal
      opened={Boolean(editing)}
      onClose={() => { if (!busy) setEditing(null); }}
      title={`Edit program${editing ? ` · ${editing.code}` : ""}`}
      size="lg"
      centered
      closeOnEscape={!busy}
      closeOnClickOutside={!busy}
      withCloseButton={!busy}
    >
      {editing && <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">Perubahan gaji guru berlaku mulai bulan berikutnya.</Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Nama program" required disabled={busy} value={editing.subject} onChange={(event) => setEditing({ ...editing, subject: event.currentTarget.value })} />
            <NumberInput label="Jumlah sesi" min={1} allowDecimal={false} required disabled={busy} value={editing.session_count} onChange={(value) => setEditing({ ...editing, session_count: Number(value) || 0 })} />
            <Select label="Durasi per sesi (menit)" required disabled={busy} data={["45", "60", "75", "90", "105", "120", "135", "150", "180"]} value={String(editing.duration_minutes)} onChange={(value) => setEditing({ ...editing, duration_minutes: Number(value) })} />
            <NumberInput label="Gaji guru per sesi (Rp)" min={0} required disabled={busy} thousandSeparator="." decimalSeparator="," value={editing.teacher_rate_per_session} onChange={(value) => setEditing({ ...editing, teacher_rate_per_session: Number(value) || 0 })} />
          </SimpleGrid>
          <MultiSelect label="Mata pelajaran" disabled={busy} data={subjects.filter((item) => item.teaching_language === editing.teaching_language).map((item) => ({ value: String(item.id), label: item.name }))} value={editing.subject_ids.map(String)} onChange={(values) => setEditing({ ...editing, subject_ids: values.map(Number) })} required />
          <Switch label="Program aktif" disabled={busy} checked={editing.active} onChange={(event) => setEditing({ ...editing, active: event.currentTarget.checked })} />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" disabled={busy} onClick={() => setEditing(null)}>Batal</Button>
            <Button type="submit" loading={busy} disabled={!editing.subject.trim() || editing.session_count < 1 || !editing.duration_minutes || !editing.subject_ids.length}>Simpan</Button>
          </Group>
        </Stack>
      </form>}
    </Modal>
  </Stack>;
}
