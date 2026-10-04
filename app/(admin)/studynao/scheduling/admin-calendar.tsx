"use client";

import { useState } from "react";
import { Button, Group, SegmentedControl, Stack, Text } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import styles from "./admin-calendar.module.css";

type CalendarSession = { id: number; starts_at: string; ends_at: string; status: string; code: string; subject: string; teacher: string; students: string };
type View = "day" | "week" | "month";
const inJakarta = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
};
const date = (key: string) => new Date(`${key}T00:00:00Z`);
const addDays = (key: string, count: number) => { const next = date(key); next.setUTCDate(next.getUTCDate() + count); return next.toISOString().slice(0, 10); };
const monday = (key: string) => addDays(key, -((date(key).getUTCDay() + 6) % 7));
const label = (key: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(date(key));
const time = (value: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
const minuteOfDay = (value: string) => { const [hour, minute] = time(value).split(":").map(Number); return hour * 60 + minute; };

export function AdminCalendar({ sessions }: { sessions: CalendarSession[] }) {
  const [view, setView] = useState<View>("week");
  const [selected, setSelected] = useState(() => inJakarta(new Date()));
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
  function move(direction: number) {
    if (view === "month") { const next = date(monthStart); next.setUTCMonth(next.getUTCMonth() + direction); setSelected(next.toISOString().slice(0, 10)); }
    else setSelected(addDays(selected, direction * (view === "week" ? 7 : 1)));
  }
  return <Stack gap="md">
    <Group justify="space-between" gap="sm"><Group gap="xs"><Button variant="subtle" color="gray" px="xs" aria-label="Previous period" onClick={() => move(-1)}><IconChevronLeft size={17} /></Button><Button variant="subtle" color="gray" px="xs" aria-label="Next period" onClick={() => move(1)}><IconChevronRight size={17} /></Button><Button variant="light" size="xs" onClick={() => setSelected(inJakarta(new Date()))}>Today</Button><Text fw={700}>{title}</Text></Group><SegmentedControl value={view} onChange={(value) => setView(value as View)} data={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }]} /></Group>
    <div className={styles.scroll}>{view === "month" ? <div className={styles.month}>{days.map((key) => <div key={key} className={styles.date} data-today={key === inJakarta(new Date()) || undefined} data-outside={!key.startsWith(selected.slice(0, 7)) || undefined}>
      <Text size="sm" fw={700} mb="xs">{label(key, { weekday: "short", day: "numeric", month: "short" })}</Text>
      <Stack gap={5}>{(grouped.get(key) ?? []).map((session) => <div key={session.id} className={styles.event}><Text size="xs" fw={700}>{time(session.starts_at)} · {session.subject}</Text><Text size="xs">{session.code}</Text><Text size="xs">{session.teacher}</Text></div>)}</Stack>
    </div>)}</div> : <div className={styles.timeline} data-view={view}><div className={styles.timeColumn}><div className={styles.timeHeader} />{Array.from({ length: 16 }, (_, index) => <span key={index} style={{ top: 38 + index * 48 }}>{String(index + 7).padStart(2, "0")}:00</span>)}</div>{days.map((key) => <div key={key} className={styles.timelineDay}><Text className={styles.timelineHead} size="sm" fw={700}>{label(key, { weekday: "short", day: "numeric", month: "short" })}</Text><div className={styles.timeBody}>{(grouped.get(key) ?? []).map((session) => <div key={session.id} className={styles.timedEvent} style={{ top: (minuteOfDay(session.starts_at) - 420) * .8, height: Math.max(28, (minuteOfDay(session.ends_at) - minuteOfDay(session.starts_at)) * .8) }}><Text size="xs" fw={700}>{time(session.starts_at)}–{time(session.ends_at)} · {session.subject}</Text><Text size="xs">{session.code} · {session.status}</Text><Text size="xs" lineClamp={2}>{session.teacher} · {session.students}</Text></div>)}</div></div>)}</div>}</div>
    {!sessions.length && <Text ta="center" c="dimmed" py="lg">No sessions match the filters.</Text>}
  </Stack>;
}
