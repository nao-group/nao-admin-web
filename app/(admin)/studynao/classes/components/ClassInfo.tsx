import Link from "next/link";
import { Alert, Badge, Button, Card, Group, Progress, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { DetailItem } from "@/components/ui/admin";
import type { ClassesOverview, Session, StudyClass } from "../types";
import { CLASS_LABELS, COLORS, classHref, classStatus, formatDate, sessionRange, sessionStatus, slotLabel } from "../data";

export function ClassInfo({ course, sessions, data, now }: { course: StudyClass; sessions: Session[]; data: ClassesOverview; now: number }) {
  const program = data.programs.find((item) => item.id === course.program_id);
  const subject = data.subjects.find((item) => item.id === course.offering_id)?.name ?? "Mata pelajaran";
  const active = sessions.filter((session) => session.status !== "cancelled");
  const chronological = [...active].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const completed = active.filter((session) => sessionStatus(session, now) === "completed").length;
  const awaiting = active.filter((session) => sessionStatus(session, now) === "awaiting_log");
  const next = chronological.find((session) => Date.parse(session.ends_at) > now);
  const status = classStatus(course, sessions, now);
  const duration = course.duration_minutes ?? (active[0] ? Math.round((Date.parse(active[0].ends_at) - Date.parse(active[0].starts_at)) / 60000) : program?.duration_minutes);

  return <Stack gap="lg">
    <Card className="surface-card" radius="lg" p="xl">
      <Text className="eyebrow">COURSE INFO</Text><Group justify="space-between" align="start" mt="sm"><Title order={1} size="h2">{subject}</Title><Badge color={COLORS[status]} variant="light">{CLASS_LABELS[status]}</Badge></Group><Text c="dimmed" mt="sm">{course.code}</Text>
      <Group mt="md"><Badge color="yellow" variant="light">{course.class_type === "private" ? "Private" : "Group"}</Badge><Badge color="blue" variant="light">{course.teaching_language || program?.teaching_language || "—"}</Badge></Group>
      <SimpleGrid cols={{ base: 1, sm: 3 }} mt="xl"><DetailItem label="Total sesi" value={String(sessions.length)} /><DetailItem label="Completed" value={`${completed}/${active.length} sesi aktif`} /><DetailItem label="Durasi sesi" value={duration ? `${duration} menit` : "—"} /></SimpleGrid>
      <Progress value={active.length ? completed / active.length * 100 : 0} color="teal" mt="lg" aria-label="Progres sesi selesai" />
      <Text size="xs" c="dimmed" mt="sm">Completed menunjukkan sesi yang sudah ditandai selesai atau lognya telah disubmit. Sesi yang dibatalkan tidak masuk progres.</Text>
    </Card>
    {awaiting.length > 0 && <Alert color="orange" title={`${awaiting.length} sesi menunggu log guru`}><Text size="sm">Waktu sesi sudah berakhir, tetapi laporan pengajaran belum disubmit.</Text><Button component={Link} href={classHref(course.id, awaiting[0].id)} variant="light" color="orange" size="xs" mt="md">Lihat sesi tanpa log</Button></Alert>}
    <Card className="surface-card" radius="lg" p="xl"><Title order={2} size="h3" mb="lg">Informasi kelas</Title><SimpleGrid cols={{ base: 1, sm: 2 }}>
      <DetailItem label="Guru" value={course.teacher?.full_name ?? "Belum ditentukan"} /><DetailItem label="Email guru" value={course.teacher?.email ?? "—"} />
      <DetailItem label="Mulai" value={formatDate(chronological[0]?.starts_at ?? course.first_date)} /><DetailItem label="Sesi terakhir" value={chronological.length ? formatDate(chronological[chronological.length - 1].ends_at) : "Belum ada sesi"} />
      <DetailItem label="Program" value={program ? `${program.program} · ${program.subject}` : "—"} /><DetailItem label="Kuota murid" value={`${course.student_ids.length}/${course.capacity} murid`} />
    </SimpleGrid><Text fw={600} size="sm" mt="xl" mb="sm">Jadwal mingguan</Text><Stack gap="xs">{course.slots.map((slot, index) => <DetailItem key={index} label={`Jadwal ${index + 1}`} value={slotLabel(slot)} />)}{!course.slots.length && <Text size="sm" c="dimmed">Jadwal mingguan belum tersedia.</Text>}</Stack></Card>
    <Card className="surface-card" radius="lg" p="xl"><Title order={2} size="h3" mb="lg">Murid terdaftar</Title><Stack gap="sm">{course.student_ids.map((id, index) => <DetailItem key={id} label={`Murid ${index + 1}`} value={course.student_names[index] || "Murid"} />)}{!course.student_ids.length && <Text c="dimmed" size="sm">Belum ada murid yang terdaftar.</Text>}</Stack></Card>
    {next && course.status !== "cancelled" && <Card className="surface-card" radius="lg" p="xl"><Title order={2} size="h3">Sesi berikutnya</Title><Text mt="sm" c="dimmed">Session {next.session_number} · {formatDate(next.starts_at)} · {sessionRange(next)}</Text><Button component={Link} href={classHref(course.id, next.id)} mt="lg">Lihat sesi</Button></Card>}
  </Stack>;
}
