"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Group, MultiSelect, NumberInput, Select, SimpleGrid, Stack, Tabs, Text, TextInput, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCalendarPlus, IconSearch } from "@tabler/icons-react";
import { PageHeader } from "@/components/ui/admin";
import { refreshAdminNotifications } from "@/lib/teacher-approvals";
import { AdminCalendar } from "./admin-calendar";

type Slot = { weekday: number; start_minute: number; end_minute: number };
type Program = { id: number; subject: string; program: string; class_type: "private" | "group"; teaching_language: string; session_count: number; duration_minutes: number; subject_ids: number[]; active: boolean };
type Subject = { id: number; name: string; teaching_language: string };
type Teacher = { id: number; full_name: string; class_types: string[]; teaching_languages: string[]; offering_ids: number[] };
type Request = { id: number; student_user_id: string; student?: { full_name: string; email: string }; program_id: number; offering_id: number; preferred_start_date: string; status: string };
type Class = { id: number; code: string; program_id: number; offering_id: number; teacher_staff_id: number; teacher?: { full_name: string }; first_date: string; capacity: number; class_type: string; slots: Slot[]; student_ids: string[]; student_names: string[] };
type Session = { id: number; class_id: number; session_number: number; starts_at: string; ends_at: string; status: string };
type Overview = { requests: Request[]; classes: Class[]; sessions: Session[]; programs: Program[]; subjects: Subject[]; available_teachers: Teacher[] };
type Match = { teacher_staff_id: number; teacher_name: string; slots: Slot[] };
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const minuteText = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
const slotKey = (slot: Slot) => `${slot.weekday}:${slot.start_minute}:${slot.end_minute}`;
const slotLabel = (slot: Slot) => `${DAYS[slot.weekday]} ${minuteText(slot.start_minute)}–${minuteText(slot.end_minute)}`;
const parseSlot = (value: string): Slot => { const [weekday, start_minute, end_minute] = value.split(":").map(Number); return { weekday, start_minute, end_minute }; };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin/studynao/scheduling${path}`, { ...init, cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail ?? "Request failed.");
  return body as T;
}

export default function StudyNaoSchedulingPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<Record<number, Match[]>>({});
  const [privateTeacher, setPrivateTeacher] = useState<Record<number, string>>({});
  const [privateSlots, setPrivateSlots] = useState<Record<number, string[]>>({});
  const [privateDates, setPrivateDates] = useState<Record<number, string>>({});
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

  async function load() { try { setData(await api<Overview>("")); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load scheduling."); } }
  useEffect(() => { void Promise.resolve().then(load); }, []);
  const group = data?.programs.find((item) => String(item.id) === groupProgram);
  const availableGroupTeachers = useMemo(() => data?.available_teachers.filter((teacher) => group && groupSubject && teacher.class_types.includes("group") && teacher.teaching_languages.includes(group.teaching_language) && teacher.offering_ids.includes(Number(groupSubject))) ?? [], [data, group, groupSubject]);
  const times = group ? Array.from({ length: Math.floor((22 * 60 - group.duration_minutes - 7 * 60) / 15) + 1 }, (_, index) => 7 * 60 + index * 15) : [];
  const visibleSessions = data?.sessions.filter((session) => { const classroom = data.classes.find((item) => item.id === session.class_id); const subject = data.subjects.find((item) => item.id === classroom?.offering_id)?.name ?? ""; const q = search.toLowerCase(); return classroom && (!subjectFilter || String(classroom.offering_id) === subjectFilter) && `${classroom.code} ${classroom.teacher?.full_name ?? ""} ${classroom.student_names.join(" ")} ${subject}`.toLowerCase().includes(q); }) ?? [];
  const calendarSessions = visibleSessions.map((session) => { const classroom = data?.classes.find((item) => item.id === session.class_id); return { id: session.id, starts_at: session.starts_at, ends_at: session.ends_at, status: session.status, code: classroom?.code ?? "", subject: data?.subjects.find((item) => item.id === classroom?.offering_id)?.name ?? "Subject", teacher: classroom?.teacher?.full_name ?? "", students: classroom?.student_names.join(", ") ?? "" }; });

  async function recommend(requestId: number) {
    try { const result = await api<{ matches: Match[] }>(`/private-requests/${requestId}/matches`); setMatches((current) => ({ ...current, [requestId]: result.matches })); }
    catch (cause) { notifications.show({ color: "red", message: cause instanceof Error ? cause.message : "Unable to find overlaps." }); }
  }
  async function createPrivate(request: Request, program: Program) {
    const teacherId = Number(privateTeacher[request.id]);
    const slots = (privateSlots[request.id] ?? []).map(parseSlot);
    const required = program.session_count / 4;
    if (!teacherId || slots.length !== required) { notifications.show({ color: "red", message: `Choose a teacher and ${required} weekly slots.` }); return; }
    setBusy(true);
    try {
      await api("/classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request_id: request.id, program_id: request.program_id, offering_id: request.offering_id, teacher_staff_id: teacherId, first_date: privateDates[request.id] ?? request.preferred_start_date, slots, capacity: 1 }) });
      notifications.show({ color: "teal", message: "Private class and its full period have been scheduled." });
      refreshAdminNotifications();
      await load();
    } catch (cause) { notifications.show({ color: "red", message: cause instanceof Error ? cause.message : "Unable to create class." }); }
    finally { setBusy(false); }
  }
  async function createGroup() {
    if (!group || !groupSubject || !groupTeacher || !groupDate || !groupSlots.length) { notifications.show({ color: "red", message: "Complete the group class details and weekly slots." }); return; }
    setBusy(true);
    try {
      await api("/classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ program_id: group.id, offering_id: Number(groupSubject), teacher_staff_id: Number(groupTeacher), first_date: groupDate, slots: groupSlots, capacity: Number(groupCapacity) }) });
      notifications.show({ color: "teal", message: "Group class and sessions have been created." });
      refreshAdminNotifications();
      setGroupSlots([]); await load();
    } catch (cause) { notifications.show({ color: "red", message: cause instanceof Error ? cause.message : "Unable to create group class." }); }
    finally { setBusy(false); }
  }

  return <Stack gap="lg"><PageHeader eyebrow="StudyNao" title="Class scheduling" description="Match private availability, create group classes, and review every session in Jakarta time (WIB)." />
    {error && <Card withBorder><Text c="red" role="alert">{error}</Text><Button mt="sm" variant="light" onClick={() => void load()}>Try again</Button></Card>}
    <Tabs defaultValue="private"><Tabs.List><Tabs.Tab value="private">Private requests <Badge ml={6} size="sm">{data?.requests.filter((request) => data.programs.some((program) => program.id === request.program_id && program.class_type === "private")).length ?? 0}</Badge></Tabs.Tab><Tabs.Tab value="group">Create group class</Tabs.Tab><Tabs.Tab value="calendar">All schedules</Tabs.Tab></Tabs.List>
      <Tabs.Panel value="private" pt="lg"><Stack>{data?.requests.filter((request) => data.programs.some((program) => program.id === request.program_id && program.class_type === "private")).map((request) => { const program = data.programs.find((item) => item.id === request.program_id)!; const subject = data.subjects.find((item) => item.id === request.offering_id); const choices = matches[request.id] ?? []; const selectedTeacher = choices.find((item) => String(item.teacher_staff_id) === privateTeacher[request.id]); return <Card key={request.id} withBorder radius="lg" p="lg"><Group justify="space-between" mb="sm"><div><Text fw={700}>{request.student?.full_name ?? request.student_user_id} · {subject?.name ?? "Subject"}</Text><Text size="sm" c="dimmed">{program.subject} · {program.teaching_language} · {program.session_count} sessions × {program.duration_minutes} minutes · requested from {request.preferred_start_date}</Text></div><Button variant="light" onClick={() => void recommend(request.id)}>Find overlaps</Button></Group>{matches[request.id] && <Stack gap="md"><Text size="sm" c="dimmed">{choices.length ? `${choices.length} eligible teacher(s) with overlapping times.` : "No overlap yet. Ask the student or teacher to update availability."}</Text><SimpleGrid cols={{ base: 1, sm: 2 }}><Select label="Teacher" placeholder="Select teacher" data={choices.map((item) => ({ value: String(item.teacher_staff_id), label: item.teacher_name }))} value={privateTeacher[request.id] ?? null} onChange={(value) => { setPrivateTeacher((current) => ({ ...current, [request.id]: value ?? "" })); setPrivateSlots((current) => ({ ...current, [request.id]: [] })); }} /><TextInput label="First class date" type="date" min={request.preferred_start_date} value={privateDates[request.id] ?? request.preferred_start_date} onChange={(event) => setPrivateDates((current) => ({ ...current, [request.id]: event.currentTarget.value }))} /></SimpleGrid><MultiSelect label={`Weekly class times · choose ${program.session_count / 4}`} description="Only overlapping student and teacher times are shown." data={(selectedTeacher?.slots ?? []).map((slot) => ({ value: slotKey(slot), label: slotLabel(slot) }))} value={privateSlots[request.id] ?? []} maxValues={program.session_count / 4} onChange={(value) => setPrivateSlots((current) => ({ ...current, [request.id]: value }))} /><Group justify="flex-end"><Button loading={busy} disabled={!selectedTeacher} leftSection={<IconCalendarPlus size={16} />} onClick={() => void createPrivate(request, program)}>Finalize private class</Button></Group></Stack>}</Card>; })}{data && !data.requests.some((request) => data.programs.some((program) => program.id === request.program_id && program.class_type === "private")) && <Card withBorder><Text c="dimmed">No private requests are waiting for scheduling.</Text></Card>}</Stack></Tabs.Panel>
      <Tabs.Panel value="group" pt="lg"><Card withBorder radius="lg" p="lg"><Title order={2} size="h3" mb="md">New group class</Title><SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}><Select label="Program" data={data?.programs.filter((item) => item.active && item.class_type === "group").map((item) => ({ value: String(item.id), label: `${item.subject} · ${item.teaching_language} · ${item.session_count} sessions` })) ?? []} value={groupProgram} onChange={(value) => { setGroupProgram(value); setGroupSubject(null); setGroupTeacher(null); setGroupSlots([]); }} /><Select label="Subject" data={data?.subjects.filter((item) => group?.subject_ids.includes(item.id)).map((item) => ({ value: String(item.id), label: item.name })) ?? []} value={groupSubject} onChange={(value) => { setGroupSubject(value); setGroupTeacher(null); }} /><Select label="Teacher" data={availableGroupTeachers.map((item) => ({ value: String(item.id), label: item.full_name }))} value={groupTeacher} onChange={setGroupTeacher} /><TextInput label="Start date" type="date" value={groupDate} onChange={(event) => setGroupDate(event.currentTarget.value)} /><NumberInput label="Capacity" min={4} max={6} value={groupCapacity} onChange={setGroupCapacity} /></SimpleGrid><Text fw={700} size="sm" mt="lg" mb="xs">Weekly timetable</Text><Text size="xs" c="dimmed" mb="md">Add enough sessions to cover the package over 12 weeks. Each session lasts {group?.duration_minutes ?? "—"} minutes.</Text><Group align="end"><Select label="Day" data={DAYS.map((label, value) => ({ value: String(value), label }))} value={groupDay} onChange={setGroupDay} w={125} /><Select label="Start time" data={times.map((minute) => ({ value: String(minute), label: minuteText(minute) }))} value={groupTime} onChange={setGroupTime} searchable w={140} /><Button variant="light" disabled={!group || !groupDay || !groupTime} onClick={() => { if (!group || !groupDay || !groupTime) return; const slot = { weekday: Number(groupDay), start_minute: Number(groupTime), end_minute: Number(groupTime) + group.duration_minutes }; if (groupSlots.some((item) => item.weekday === slot.weekday && item.start_minute < slot.end_minute && slot.start_minute < item.end_minute)) { notifications.show({ color: "red", message: "Weekly class slots cannot overlap." }); return; } setGroupSlots((current) => [...current, slot].sort((a, b) => a.weekday - b.weekday || a.start_minute - b.start_minute)); }}>Add time</Button></Group><Group mt="md" gap="xs">{groupSlots.map((slot) => <Badge key={slotKey(slot)} size="lg" variant="light" rightSection={<button type="button" aria-label={`Remove ${slotLabel(slot)}`} onClick={() => setGroupSlots((current) => current.filter((item) => slotKey(item) !== slotKey(slot)))} style={{ border: 0, background: "none", cursor: "pointer" }}>×</button>}>{slotLabel(slot)}</Badge>)}</Group><Group justify="flex-end" mt="xl"><Button loading={busy} onClick={() => void createGroup()} leftSection={<IconCalendarPlus size={16} />}>Create group class</Button></Group></Card></Tabs.Panel>
      <Tabs.Panel value="calendar" pt="lg"><Card withBorder radius="lg" p="lg"><Group align="end" mb="md"><TextInput label="Search" placeholder="Teacher, student, class code…" leftSection={<IconSearch size={16} />} value={search} onChange={(event) => setSearch(event.currentTarget.value)} flex={1} miw={220} /><Select label="Subject" placeholder="All subjects" clearable data={data?.subjects.map((item) => ({ value: String(item.id), label: item.name })) ?? []} value={subjectFilter} onChange={setSubjectFilter} w={220} /></Group><AdminCalendar sessions={calendarSessions} /></Card></Tabs.Panel>
    </Tabs>
  </Stack>;
}
