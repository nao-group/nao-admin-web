"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Group, NumberInput, Select, SimpleGrid, Skeleton, Stack, Tabs, Text, TextInput, Title } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { IconCalendarPlus, IconSearch } from "@tabler/icons-react";
import { PageHeader } from "@/components/ui/admin";
import { refreshAdminNotifications } from "@/lib/teacher-approvals";
import { weeklyTeacherConflict } from "./schedule-conflicts";
import { AdminCalendar } from "./admin-calendar";

type Slot = { weekday: number; start_minute: number; end_minute: number };
type Program = { id: number; subject: string; program: string; class_type: "private" | "group"; teaching_language: string; session_count: number; duration_minutes: number; subject_ids: number[]; active: boolean };
type Subject = { id: number; name: string; teaching_language: string };
type Teacher = { id: number; full_name: string; class_types: string[]; teaching_languages: string[]; offering_ids: number[] };
type Request = { id: number; student_user_id: string; student?: { full_name: string; email: string }; program_id: number; offering_id: number; preferred_start_date: string; status: string };
type Class = { status: string; id: number; code: string; program_id: number; offering_id: number; teacher_staff_id: number; teacher?: { full_name: string }; first_date: string; capacity: number; class_type: string; slots: Slot[]; student_ids: string[]; student_names: string[] };
type Session = { id: number; class_id: number; session_number: number; starts_at: string; ends_at: string; status: string; operations?: { teaching_log: string | null; late_reason: string | null; submitted_at: string | null; attendance_report_completed: boolean } | null; student_attendance?: { student_user_id: string; student_name: string; status: string; note: string | null }[] };
type Overview = { requests: Request[]; classes: Class[]; sessions: Session[]; programs: Program[]; subjects: Subject[]; available_teachers: Teacher[] };
const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const minuteText = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
const slotKey = (slot: Slot) => `${slot.weekday}:${slot.start_minute}:${slot.end_minute}`;
const slotLabel = (slot: Slot) => `${DAYS[slot.weekday]} ${minuteText(slot.start_minute)}–${minuteText(slot.end_minute)}`;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin/studynao/scheduling${path}`, { ...init, cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail ?? "Permintaan gagal.");
  return body as T;
}

export default function StudyNaoSchedulingPage() {
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [groupProgram, setGroupProgram] = useState<string | null>(null);
  const [groupSubject, setGroupSubject] = useState<string | null>(null);
  const [groupTeacher, setGroupTeacher] = useState<string | null>(null);
  const [groupDate, setGroupDate] = useState("");
  const [groupCapacity, setGroupCapacity] = useState<number | string>(6);
  const [groupDay, setGroupDay] = useState<string | null>(null);
  const [groupTime, setGroupTime] = useState<string | null>(null);
  const [groupSlots, setGroupSlots] = useState<Slot[]>([]);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>("private");

  async function load() { try { setData(await api<Overview>("")); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Jadwal belum dapat dimuat."); } }
  useEffect(() => { void Promise.resolve().then(load); }, []);
  const group = data?.programs.find((item) => String(item.id) === groupProgram);
  const groupSessionCount = groupSlots.length * 12;
  const availableGroupTeachers = useMemo(() => data?.available_teachers.filter((teacher) => group && groupSubject && teacher.class_types.includes("group") && teacher.teaching_languages.includes(group.teaching_language) && teacher.offering_ids.includes(Number(groupSubject))) ?? [], [data, group, groupSubject]);
  function teacherConflicts(teacherId: string | number, slot: Slot) {
    const classIds = new Set(data?.classes.filter(item => item.status !== "cancelled" && item.teacher_staff_id === Number(teacherId)).map(item => item.id));
    return weeklyTeacherConflict(slot, groupDate, 12, data?.sessions.filter(item => classIds.has(item.class_id)) ?? []);
  }
  const groupConflict = Boolean(groupTeacher && groupSlots.some(slot => teacherConflicts(groupTeacher, slot)));
  const proposedSlot = group && groupDay !== null && groupTime !== null ? { weekday: Number(groupDay), start_minute: Number(groupTime), end_minute: Number(groupTime) + group.duration_minutes } : null;
  const proposedConflict = Boolean(groupTeacher && proposedSlot && teacherConflicts(groupTeacher, proposedSlot));
  const times = group ? Array.from({ length: Math.floor((22 * 60 - group.duration_minutes - 7 * 60) / 15) + 1 }, (_, index) => 7 * 60 + index * 15) : [];
  const visibleSessions = data?.sessions.filter((session) => { const classroom = data.classes.find((item) => item.id === session.class_id); const subject = data.subjects.find((item) => item.id === classroom?.offering_id)?.name ?? ""; const q = search.toLowerCase(); return classroom && (!subjectFilter || String(classroom.offering_id) === subjectFilter) && `${classroom.code} ${classroom.teacher?.full_name ?? ""} ${classroom.student_names.join(" ")} ${subject}`.toLowerCase().includes(q); }) ?? [];
  const calendarSessions = visibleSessions.map((session) => { const classroom = data?.classes.find((item) => item.id === session.class_id); return { id: session.id, starts_at: session.starts_at, ends_at: session.ends_at, status: session.status, operations: session.operations ?? null, studentAttendance: session.student_attendance ?? [], code: classroom?.code ?? "", subject: data?.subjects.find((item) => item.id === classroom?.offering_id)?.name ?? "Mata pelajaran", teacher: classroom?.teacher?.full_name ?? "", students: classroom?.student_names.join(", ") ?? "" }; });

  async function createGroup() {
    if (!group || !groupSubject || !groupTeacher || !groupDate || !groupSlots.length) { notifications.show({ color: "red", message: "Lengkapi detail kelas grup dan jadwal mingguan." }); return; }
    if (groupConflict) { notifications.show({ color: "red", message: "Guru sudah mengajar kelas lain pada jadwal ini. Pilih guru atau jam yang lain." }); return; }
    if (groupSessionCount < group.session_count) { notifications.show({ color: "red", message: "Tambahkan jadwal mingguan agar jumlah sesi paket terpenuhi." }); return; }
    setBusy(true);
    try {
      await api("/classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ program_id: group.id, offering_id: Number(groupSubject), teacher_staff_id: Number(groupTeacher), first_date: groupDate, slots: groupSlots, capacity: Number(groupCapacity) }) });
      notifications.show({ color: "teal", message: "Kelas grup dan sesinya berhasil dibuat." });
      refreshAdminNotifications();
      setGroupSlots([]); await load();
    } catch (cause) { notifications.show({ color: "red", message: cause instanceof Error ? cause.message : "Kelas grup belum dapat dibuat." }); }
    finally { setBusy(false); }
  }

  return <Stack gap="lg"><PageHeader eyebrow="StudyNao" title="Penjadwalan kelas" description="Cocokkan ketersediaan kelas privat, buat kelas grup, dan tinjau semua sesi dalam waktu Jakarta (WIB)." />
    {error && <Card withBorder><Text c="red" role="alert">{error}</Text><Button mt="sm" variant="light" onClick={() => void load()}>Coba lagi</Button></Card>}
    <Tabs value={activeTab} onChange={setActiveTab}><Tabs.List><Tabs.Tab value="private">Permintaan privat <Badge ml={6} size="sm">{data?.requests.filter((request) => data.programs.some((program) => program.id === request.program_id && program.class_type === "private")).length ?? 0}</Badge></Tabs.Tab><Tabs.Tab value="group">Buat kelas grup</Tabs.Tab><Tabs.Tab value="calendar">Semua jadwal</Tabs.Tab></Tabs.List>
      <Tabs.Panel value="private" pt="lg"><Stack>{!data && !error && [0, 1, 2].map((item) => <Card key={item} withBorder radius="lg" p="lg" aria-busy="true"><Group justify="space-between" align="center" gap="md"><div style={{ flex: 1 }}><Skeleton height={18} width="40%" mb={10} /><Skeleton height={14} width="75%" /></div><Skeleton height={36} width={170} radius="md" /></Group></Card>)}{data?.requests.filter((request) => data.programs.some((program) => program.id === request.program_id && program.class_type === "private")).map((request) => { const program = data.programs.find((item) => item.id === request.program_id)!; const subject = data.subjects.find((item) => item.id === request.offering_id); return <Card key={request.id} withBorder radius="lg" p="lg"><Group justify="space-between" align="center" gap="md"><div><Text fw={700}>{request.student?.full_name ?? request.student_user_id} · {subject?.name ?? "Mata pelajaran"}</Text><Text size="sm" c="dimmed">{program.subject} · {program.teaching_language} · {program.session_count} sesi × {program.duration_minutes} menit · diminta mulai {request.preferred_start_date}</Text></div><Button variant="light" onClick={() => router.push(`/studynao/scheduling/overlaps/${request.id}`)}>Cari jadwal yang cocok</Button></Group></Card>; })}{data && !data.requests.some((request) => data.programs.some((program) => program.id === request.program_id && program.class_type === "private")) && <Card withBorder><Text c="dimmed">Tidak ada permintaan privat yang menunggu dijadwalkan.</Text></Card>}</Stack></Tabs.Panel>
      <Tabs.Panel value="group" pt="lg"><Card withBorder radius="lg" p="lg"><Title order={2} size="h3" mb="md">Kelas grup baru</Title><SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}><Select label="Program" data={data?.programs.filter((item) => item.active && item.class_type === "group").map((item) => ({ value: String(item.id), label: `${item.subject} · ${item.teaching_language} · ${item.session_count} sesi` })) ?? []} value={groupProgram} onChange={(value) => { setGroupProgram(value); setGroupSubject(null); setGroupTeacher(null); setGroupSlots([]); }} /><Select label="Mata pelajaran" data={data?.subjects.filter((item) => group?.subject_ids.includes(item.id)).map((item) => ({ value: String(item.id), label: item.name })) ?? []} value={groupSubject} onChange={(value) => { setGroupSubject(value); setGroupTeacher(null); }} /><Select label="Guru" data={availableGroupTeachers.map((item) => ({ value: String(item.id), label: `${item.full_name}${groupSlots.some(slot => teacherConflicts(item.id, slot)) ? " · Jadwal bentrok" : ""}`, disabled: groupSlots.some(slot => teacherConflicts(item.id, slot)) }))} value={groupTeacher} onChange={setGroupTeacher} /><DatePickerInput label="Tanggal mulai" placeholder="Pilih tanggal mulai" value={groupDate || null} onChange={(value) => setGroupDate(value ?? "")} valueFormat="DD MMMM YYYY" clearable={false} /><NumberInput label="Kapasitas" min={4} max={6} value={groupCapacity} onChange={setGroupCapacity} /></SimpleGrid><Text fw={700} size="sm" mt="lg" mb="xs">Jadwal mingguan</Text><Text size="xs" c="dimmed" mb="md">Tambahkan sesi yang cukup untuk mencakup paket selama 12 minggu. Setiap sesi berdurasi {group?.duration_minutes ?? "—"} menit.</Text><Group align="end"><Select label="Hari" data={DAYS.map((label, value) => ({ value: String(value), label }))} value={groupDay} onChange={setGroupDay} w={125} /><Select label="Jam mulai" data={times.map((minute) => ({ value: String(minute), label: `${minuteText(minute)}${groupTeacher && groupDay !== null && group && teacherConflicts(groupTeacher, { weekday: Number(groupDay), start_minute: minute, end_minute: minute + group.duration_minutes }) ? " · Guru sudah mengajar" : ""}`, disabled: Boolean(groupTeacher && groupDay !== null && group && teacherConflicts(groupTeacher, { weekday: Number(groupDay), start_minute: minute, end_minute: minute + group.duration_minutes })) }))} value={groupTime} onChange={setGroupTime} searchable w={140} /><Button variant="light" disabled={!group || !groupDay || !groupTime || proposedConflict || !groupDate} onClick={() => { if (!group || !groupDay || !groupTime || proposedConflict || !groupDate) return; const slot = { weekday: Number(groupDay), start_minute: Number(groupTime), end_minute: Number(groupTime) + group.duration_minutes }; if (groupSlots.some((item) => item.weekday === slot.weekday && item.start_minute < slot.end_minute && slot.start_minute < item.end_minute)) { notifications.show({ color: "red", message: "Jadwal mingguan tidak boleh bertabrakan." }); return; } setGroupSlots((current) => [...current, slot].sort((a, b) => a.weekday - b.weekday || a.start_minute - b.start_minute)); }}>Tambah jam</Button></Group><Group mt="md" gap="xs">{groupSlots.map((slot) => { return <Badge key={slotKey(slot)} size="lg" color={groupTeacher && teacherConflicts(groupTeacher, slot) ? "red" : "teal"} variant="light" rightSection={<button type="button" aria-label={`Hapus ${slotLabel(slot)}`} onClick={() => setGroupSlots((current) => current.filter((item) => slotKey(item) !== slotKey(slot)))} style={{ border: 0, background: "none", cursor: "pointer" }}>×</button>}>{slotLabel(slot)}</Badge>; })}</Group>
        {(groupConflict || proposedConflict) && <Text c="red" size="sm" mt="md" role="alert">Guru sudah mengajar kelas lain pada jam ini dalam periode 12 minggu. Hapus jam yang bentrok atau pilih guru lain.</Text>}
        <Text c="dimmed" size="xs" mt="md">Jam yang berbenturan dengan kelas private maupun group guru selama periode paket tidak dapat dipilih. Pemeriksaan dilakukan dalam WIB dan diperiksa kembali saat disimpan.</Text>
        {group && groupSlots.length > 0 && <Text size="sm" c={groupSessionCount < group.session_count ? "yellow.8" : "dimmed"} mt="md">Jadwal ini menyediakan {groupSessionCount} sesi dalam 12 minggu; paket membutuhkan {group.session_count} sesi.</Text>}
        <Group justify="flex-end" mt="xl"><Button loading={busy} disabled={!group || !groupSubject || !groupTeacher || !groupDate || !groupSlots.length || groupSessionCount < group.session_count || groupConflict} onClick={() => void createGroup()} leftSection={<IconCalendarPlus size={16} />}>Buat kelas grup</Button></Group></Card></Tabs.Panel>
      <Tabs.Panel value="calendar" pt="lg"><Card withBorder radius="lg" p="lg"><Group align="end" mb="md"><TextInput label="Cari" placeholder="Guru, murid, kode kelas…" leftSection={<IconSearch size={16} />} value={search} onChange={(event) => setSearch(event.currentTarget.value)} flex={1} miw={220} /><Select label="Mata pelajaran" placeholder="Semua mata pelajaran" clearable data={data?.subjects.map((item) => ({ value: String(item.id), label: item.name })) ?? []} value={subjectFilter} onChange={setSubjectFilter} w={220} /></Group><AdminCalendar sessions={calendarSessions} /></Card></Tabs.Panel>
    </Tabs>
  </Stack>;
}
