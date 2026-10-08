import { Alert, Badge, Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { DetailItem } from "@/components/ui/admin";
import type { Session, StudyClass } from "../types";
import { COLORS, SESSION_LABELS, formatDate, formatTime, sessionRange, sessionStatus } from "../data";
import styles from "../classes.module.css";

const ATTENDANCE_LABELS: Record<string, string> = { present: "Hadir", late: "Terlambat", absent: "Tidak hadir", excused: "Izin" };
const ATTENDANCE_COLORS: Record<string, string> = { present: "teal", late: "yellow", absent: "red", excused: "blue" };

export function SessionInfo({ course, session, subject, now }: { course: StudyClass; session: Session; subject: string; now: number }) {
  const status = sessionStatus(session, now);
  const operations = session.operations;
  const attendance = course.student_ids.map((id, index) => {
    const saved = session.student_attendance?.find((item) => item.student_user_id === id);
    return { id, name: course.student_names[index] || saved?.student_name || "Murid", status: saved?.status, note: saved?.note };
  });

  return <Stack gap="lg">
    <Card className="surface-card" radius="lg" p="xl"><Text className="eyebrow">{subject}</Text><div className={styles.sessionHeading}><Title order={1} size="h2" mt="sm">Session {session.session_number}</Title><Badge mt="sm" color={COLORS[status]} variant="light">{SESSION_LABELS[status]}</Badge></div><Text c="dimmed" mt="sm">{course.code}</Text><SimpleGrid cols={{ base: 1, sm: 2 }} mt="xl"><DetailItem label="Tanggal" value={formatDate(session.starts_at)} /><DetailItem label="Waktu" value={sessionRange(session)} /><DetailItem label="Guru" value={course.teacher?.full_name ?? "Belum ditentukan"} /></SimpleGrid></Card>
    {status === "awaiting_log" && <Alert color="orange">Sesi sudah berakhir. Guru belum mengirim log dan laporan absensi.</Alert>}
    {status === "cancelled" && <Alert color="gray">Sesi ini dibatalkan.</Alert>}
    <Card className="surface-card" radius="lg" p="xl"><Group justify="space-between" mb="lg"><Title order={2} size="h3">Log pengajaran</Title><Badge color={operations?.submitted_at ? "teal" : "gray"} variant="light">{operations?.submitted_at ? "Submitted" : "Not submitted"}</Badge></Group>
      {operations?.teaching_log ? <Text className={styles.report}>{operations.teaching_log}</Text> : <Text c="dimmed" size="sm">Belum ada log pengajaran untuk sesi ini.</Text>}
      {operations?.submitted_at && <Text size="sm" c="dimmed" mt="lg">Disubmit {formatDate(operations.submitted_at)} pukul {formatTime(operations.submitted_at)} WIB</Text>}
      {operations?.late_reason && <div style={{ marginTop: 20 }}><DetailItem label="Alasan terlambat mengisi log" value={<Text size="sm" className={styles.report}>{operations.late_reason}</Text>} /></div>}
    </Card>
    <Card className="surface-card" radius="lg" p="xl"><Title order={2} size="h3" mb="lg">Absensi murid</Title>{attendance.map((student) => <div key={student.id} className={styles.attendanceRow}><Group justify="space-between"><Text fw={600} size="sm">{student.name}</Text><Badge color={student.status ? ATTENDANCE_COLORS[student.status] ?? "gray" : "gray"} variant="light">{student.status ? ATTENDANCE_LABELS[student.status] ?? student.status : "Belum diisi"}</Badge></Group>{student.note && <Text size="sm" c="dimmed" mt={6} className={styles.report}>{student.note}</Text>}</div>)}{!attendance.length && <Text size="sm" c="dimmed">Belum ada murid terdaftar di kelas ini.</Text>}</Card>
  </Stack>;
}
