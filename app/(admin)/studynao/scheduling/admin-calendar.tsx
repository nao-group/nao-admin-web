"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Divider, Drawer, Group, Select, SegmentedControl, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import styles from "./admin-calendar.module.css";

type CalendarSession = { id: number; starts_at: string; ends_at: string; status: string; zoom?: { name: string; email: string; password: string } | null; code: string; subject: string; teacher: string; students: string };
type View = "day" | "week" | "month";
const inJakarta = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
};
const date = (key: string) => new Date(`${key}T00:00:00Z`);
const addDays = (key: string, count: number) => { const next = date(key); next.setUTCDate(next.getUTCDate() + count); return next.toISOString().slice(0, 10); };
const monday = (key: string) => addDays(key, -((date(key).getUTCDay() + 6) % 7));
const label = (key: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", ...options }).format(date(key));
const time = (value: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
const minuteOfDay = (value: string) => { const [hour, minute] = time(value).split(":").map(Number); return hour * 60 + minute; };

const LANE_WIDTH = 150;
const PX_PER_MINUTE = 1.6; // 24px per 15-minute row
const DAY_START = 7 * 60;
const SLOT_COUNT = (22 - 7) * 4; // 07:00–22:00 in 15-minute rows
const STATUS_LABELS: Record<string, string> = { scheduled: "Terjadwal", completed: "Selesai", cancelled: "Dibatalkan", canceled: "Dibatalkan", ongoing: "Berlangsung" };
const statusLabel = (status: string) => STATUS_LABELS[status.toLowerCase()] ?? status;
const slotText = (index: number) => { const minute = DAY_START + index * 15; return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`; };
const clickable = (open: () => void) => ({ role: "button" as const, tabIndex: 0, onClick: open, onKeyDown: (event: React.KeyboardEvent) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } } });
// Place overlapping sessions side by side: each cluster of overlapping sessions shares its lane count.
function layoutDay(list: CalendarSession[]) {
  const sorted = [...list].sort((a, b) => minuteOfDay(a.starts_at) - minuteOfDay(b.starts_at) || minuteOfDay(a.ends_at) - minuteOfDay(b.ends_at));
  const placed: { session: CalendarSession; lane: number; lanes: number }[] = [];
  let cluster: typeof placed = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => { for (const item of cluster) item.lanes = laneEnds.length; placed.push(...cluster); cluster = []; laneEnds = []; };
  for (const session of sorted) {
    const start = minuteOfDay(session.starts_at);
    const end = Math.max(minuteOfDay(session.ends_at), start + 1);
    if (cluster.length && start >= clusterEnd) flush();
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(end); } else laneEnds[lane] = end;
    clusterEnd = cluster.length ? Math.max(clusterEnd, end) : end;
    cluster.push({ session, lane, lanes: 1 });
  }
  flush();
  return placed;
}

type ZoomOption = { id: number; name: string; email: string; available: boolean };

function ZoomAssigner({ sessionId, current, onSaved }: { sessionId: number; current: boolean; onSaved: () => void }) {
  const [options, setOptions] = useState<ZoomOption[] | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [editing, setEditing] = useState(!current);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!editing) return;
    let active = true;
    fetch(`/api/admin/studynao/scheduling/sessions/${sessionId}/zoom-options`, { cache: "no-store" })
      .then(async (response) => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.detail ?? "Gagal memuat akun Zoom."); return body as { items: ZoomOption[] }; })
      .then((body) => { if (active) setOptions(body.items); })
      .catch((error) => { if (active) { setOptions([]); notifications.show({ color: "red", message: error instanceof Error ? error.message : "Gagal memuat akun Zoom." }); } });
    return () => { active = false; };
  }, [editing, sessionId]);
  async function save() {
    if (!choice) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/studynao/scheduling/sessions/${sessionId}/zoom-account`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zoom_account_id: Number(choice) }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail ?? "Gagal menyimpan akun Zoom.");
      notifications.show({ color: "teal", message: "Akun Zoom sesi diperbarui." });
      onSaved();
    } catch (error) { notifications.show({ color: "red", message: error instanceof Error ? error.message : "Gagal menyimpan akun Zoom." }); }
    finally { setSaving(false); }
  }
  if (!editing) return <Button variant="subtle" size="xs" px={0} onClick={() => setEditing(true)}>Ubah akun Zoom</Button>;
  const free = options?.filter((option) => option.available) ?? [];
  return <Stack gap="xs" mt={6}>
    <Select label="Pilih akun Zoom yang tersedia" placeholder={options ? (free.length ? "Pilih akun" : "Tidak ada akun tersedia") : "Memuat…"} disabled={!options || !free.length} data={free.map((option) => ({ value: String(option.id), label: `${option.name} · ${option.email}` }))} value={choice} onChange={setChoice} />
    <Group gap="xs"><Button size="xs" loading={saving} disabled={!choice} onClick={() => void save()}>Simpan</Button>{current && <Button size="xs" variant="default" onClick={() => { setEditing(false); setChoice(null); }}>Batal</Button>}</Group>
  </Stack>;
}

export function AdminCalendar({ sessions, onZoomChanged }: { sessions: CalendarSession[]; onZoomChanged?: () => void }) {
  const [view, setView] = useState<View>("week");
  const [selected, setSelected] = useState(() => inJakarta(new Date()));
  const [detail, setDetail] = useState<CalendarSession | null>(null);
  const weekStart = monday(selected);
  const monthStart = `${selected.slice(0, 7)}-01`;
  const gridStart = monday(monthStart);
  const days = view === "day" ? [selected] : Array.from({ length: view === "week" ? 7 : 42 }, (_, index) => addDays(view === "week" ? weekStart : gridStart, index));
  const grouped = new Map<string, CalendarSession[]>();
  for (const session of sessions) {
    const key = inJakarta(new Date(session.starts_at));
    grouped.set(key, [...(grouped.get(key) ?? []), session]);
  }
  const title = view === "month" ? label(monthStart, { month: "long", year: "numeric" }) : view === "day" ? label(selected, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : `${label(weekStart, { day: "numeric", month: "short" })} – ${label(addDays(weekStart, 6), { day: "numeric", month: "short", year: "numeric" })}`;
  const dayLayouts = new Map(days.map((key) => [key, layoutDay(grouped.get(key) ?? [])]));
  const timelineColumns = days.map((key) => `minmax(${Math.max(1, ...(dayLayouts.get(key) ?? []).map((item) => item.lanes)) * LANE_WIDTH}px, 1fr)`).join(" ");
  function move(direction: number) {
    if (view === "month") { const next = date(monthStart); next.setUTCMonth(next.getUTCMonth() + direction); setSelected(next.toISOString().slice(0, 10)); }
    else setSelected(addDays(selected, direction * (view === "week" ? 7 : 1)));
  }
  return <Stack gap="md">
    <Group justify="space-between" gap="sm"><Group gap="xs"><Button variant="subtle" color="gray" px="xs" aria-label="Periode sebelumnya" onClick={() => move(-1)}><IconChevronLeft size={17} /></Button><Button variant="subtle" color="gray" px="xs" aria-label="Periode berikutnya" onClick={() => move(1)}><IconChevronRight size={17} /></Button><Button variant="light" size="xs" onClick={() => setSelected(inJakarta(new Date()))}>Hari ini</Button><Text fw={700}>{title}</Text></Group><SegmentedControl value={view} onChange={(value) => setView(value as View)} data={[{ value: "day", label: "Hari" }, { value: "week", label: "Minggu" }, { value: "month", label: "Bulan" }]} /></Group>
    <div className={styles.scroll}>{view === "month" ? <div className={styles.month}>{days.map((key) => <div key={key} className={styles.date} data-today={key === inJakarta(new Date()) || undefined} data-outside={!key.startsWith(selected.slice(0, 7)) || undefined}>
      <Text size="sm" fw={700} mb="xs">{label(key, { weekday: "short", day: "numeric", month: "short" })}</Text>
      <Stack gap={5}>{(grouped.get(key) ?? []).map((session) => <div key={session.id} className={styles.event} {...clickable(() => setDetail(session))}><Text size="xs" fw={700}>{time(session.starts_at)} · {session.subject}</Text><Text size="xs">{session.code}</Text><Text size="xs">{session.teacher}</Text></div>)}</Stack>
    </div>)}</div> : <div className={styles.timeline} data-view={view} style={{ gridTemplateColumns: `58px ${timelineColumns}` }}><div className={styles.timeColumn}><div className={styles.timeHeader} />{Array.from({ length: SLOT_COUNT + 1 }, (_, index) => <span key={index} data-hour={index % 4 === 0 || undefined} style={{ top: 38 + index * 15 * PX_PER_MINUTE }}>{slotText(index)}</span>)}</div>{days.map((key) => <div key={key} className={styles.timelineDay}><Text className={styles.timelineHead} size="sm" fw={700}>{label(key, { weekday: "short", day: "numeric", month: "short" })}</Text><div className={styles.timeBody}>{(dayLayouts.get(key) ?? []).map(({ session, lane, lanes }) => <div key={session.id} className={styles.timedEvent} {...clickable(() => setDetail(session))} style={{ top: (minuteOfDay(session.starts_at) - DAY_START) * PX_PER_MINUTE, height: Math.max(28, (minuteOfDay(session.ends_at) - minuteOfDay(session.starts_at)) * PX_PER_MINUTE), left: `calc(${(lane / lanes) * 100}% + 3px)`, width: `calc(${100 / lanes}% - 6px)`, right: "auto" }}><Text size="xs" fw={700}>{time(session.starts_at)}–{time(session.ends_at)} · {session.subject}</Text><Text size="xs">{session.code} · {statusLabel(session.status)}</Text><Text size="xs">{session.teacher} · {session.students}</Text></div>)}</div></div>)}</div>}</div>
    <Drawer opened={detail !== null} onClose={() => setDetail(null)} position="right" size="md" title={<Text fw={700}>Detail sesi</Text>}>
      {detail && <Stack gap="md">
        <div><Text fw={700} size="lg">{detail.subject}</Text><Text size="sm" c="dimmed">{detail.code}</Text></div>
        <Badge variant="light" color="yellow" w="fit-content">{statusLabel(detail.status)}</Badge>
        <Divider />
        <div><Text size="xs" c="dimmed">Tanggal</Text><Text fw={600}>{label(inJakarta(new Date(detail.starts_at)), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</Text></div>
        <div><Text size="xs" c="dimmed">Waktu</Text><Text fw={600}>{time(detail.starts_at)}–{time(detail.ends_at)} WIB · {minuteOfDay(detail.ends_at) - minuteOfDay(detail.starts_at)} menit</Text></div>
        <div><Text size="xs" c="dimmed">Guru</Text><Text fw={600}>{detail.teacher || "—"}</Text></div>
        <div><Text size="xs" c="dimmed">Akun Zoom</Text>{detail.zoom ? <><Text fw={600}>{detail.zoom.name}</Text><Text size="sm">{detail.zoom.email}</Text><Text size="sm">Kata sandi: <Text span ff="monospace" fw={600}>{detail.zoom.password}</Text></Text></> : <Text fw={600}>Belum dipetakan</Text>}{detail.status !== "cancelled" && <ZoomAssigner key={`${detail.id}:${detail.zoom?.email ?? ""}`} sessionId={detail.id} current={Boolean(detail.zoom)} onSaved={() => { setDetail(null); onZoomChanged?.(); }} />}</div>
        <div><Text size="xs" c="dimmed">Murid</Text>{detail.students ? <Stack gap={2}>{detail.students.split(", ").map((name) => <Text key={name} fw={600}>{name}</Text>)}</Stack> : <Text fw={600}>—</Text>}</div>
      </Stack>}
    </Drawer>
    {!sessions.length && <Text ta="center" c="dimmed" py="lg">Tidak ada sesi yang sesuai dengan filter.</Text>}
  </Stack>;
}
