"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, Group, Skeleton, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft, IconBook, IconCheck, IconChevronLeft, IconChevronRight, IconClock, IconRefresh } from "@tabler/icons-react";
import { CLASS_LABELS, COLORS, SESSION_LABELS, classHref, classSessions, classStatus, formatDate, sessionRange, sessionStatus } from "../data";
import { useClassDetail } from "./use-class-detail";
import { ClassInfo } from "./ClassInfo";
import { SessionInfo } from "./SessionInfo";
import styles from "../classes.module.css";
import type { ClassesOverview, StudyClass } from "../types";

export function ClassDetailContent({ classId, sessionId }: { classId: number; sessionId: number | null }) {
  const { data, error, loading, now, reload } = useClassDetail(classId);
  const course = data?.classes.find((item) => item.id === classId);

  return <Stack gap="lg">
    <Group justify="space-between"><Button component={Link} href="/studynao/classes" variant="default" leftSection={<IconArrowLeft size={16} />}>Kembali ke kelas</Button><Group><Text size="sm" c="dimmed">Jakarta (WIB)</Text><Button variant="default" leftSection={<IconRefresh size={16} />} loading={loading} onClick={reload}>Refresh</Button></Group></Group>
    {error && <Alert color="red" title="Detail kelas belum dapat dimuat">{error}<Button ml="md" size="xs" variant="light" color="red" onClick={reload}>Coba lagi</Button></Alert>}
    {!data ? loading && <Skeleton height={460} radius="lg" /> : !course ? <Card className="surface-card" radius="lg" p="xl"><Title order={1} size="h2">Kelas tidak ditemukan</Title><Text c="dimmed" mt="sm">Kelas ini tidak tersedia. Kembali ke daftar kelas untuk memilih kelas lainnya.</Text></Card> : <>
      <ClassWorkspace course={course} data={data} sessionId={sessionId} now={now} />
    </>}
  </Stack>;
}

export function ClassWorkspace({ course, data, sessionId, now }: { course: StudyClass; data: ClassesOverview; sessionId: number | null; now: number }) {
  const router = useRouter();
  const detailRef = useRef<HTMLElement>(null);
  const classId = course.id;
  const sessions = classSessions(data.sessions, classId);
  const selectedIndex = sessions.findIndex((item) => item.id === sessionId);
  const selected = sessions[selectedIndex];
  const subject = data.subjects.find((item) => item.id === course.offering_id)?.name ?? "Mata pelajaran";
  useEffect(() => {
    detailRef.current?.focus({ preventScroll: true });
    if (sessionId !== null && window.matchMedia("(max-width: 760px)").matches) detailRef.current?.scrollIntoView({ block: "start" });
  }, [sessionId]);
  return <div className={styles.workspace}>
        <Card component="aside" className={`surface-card ${styles.sidebar}`} radius="lg" p={0}>
          <div className={styles.identity}><Text className="eyebrow">{course.class_type === "private" ? "PRIVATE CLASS" : "GROUP CLASS"}</Text><Title order={2} size="h3" mt="sm">{subject}</Title><Text size="sm" c="dimmed" mt={6} style={{ overflowWrap: "anywhere" }}>{course.code}</Text><Badge mt="md" variant="light" color={COLORS[classStatus(course, sessions, now)]}>{CLASS_LABELS[classStatus(course, sessions, now)]}</Badge></div>
          <nav className={styles.navigation} aria-label="Informasi kelas dan sesi">
            <Link href={classHref(classId)} scroll={false} className={styles.navigationLink} data-active={sessionId === null || undefined} aria-current={sessionId === null ? "page" : undefined}><IconBook size={19} aria-hidden="true" /><Text fw={600} size="sm" component="span">Course info</Text></Link>
            <Group px="lg" py="sm" justify="space-between"><Text size="xs" fw={700} c="dimmed" tt="uppercase">Sessions</Text><Badge color="yellow" variant="light">{sessions.length}</Badge></Group>
            <div className={styles.sessionList}>{sessions.map((session) => {
              const status = sessionStatus(session, now);
              return <Link key={session.id} href={classHref(classId, session.id)} scroll={false} className={styles.navigationLink} data-active={session.id === sessionId || undefined} aria-current={session.id === sessionId ? "page" : undefined}>
                <span className={styles.number}>{String(session.session_number).padStart(2, "0")}</span>
                <div className={styles.sessionCopy}><Text size="sm" fw={600}>Session {session.session_number}</Text><Text size="xs" c="dimmed" mt={2}>{formatDate(session.starts_at)}</Text><Text size="xs" c="dimmed">{sessionRange(session)}</Text><Text size="xs" c={`${COLORS[status]}.8`} mt={4}>{SESSION_LABELS[status]}</Text></div>
                {status === "completed" ? <IconCheck size={17} color="var(--mantine-color-teal-7)" aria-hidden="true" /> : <IconClock size={17} aria-hidden="true" />}
              </Link>;
            })}{!sessions.length && <Text size="sm" c="dimmed" p="lg">Belum ada sesi untuk kelas ini.</Text>}</div>
          </nav>
        </Card>
        <section className={styles.detail} ref={detailRef} tabIndex={-1} aria-label={selected ? `Detail sesi ${selected.session_number}` : "Course information"}>
          {sessionId === null ? <ClassInfo course={course} sessions={sessions} data={data} now={now} /> : selected ? <>
            <Group justify="space-between" mb="lg"><Button variant="default" size="xs" leftSection={<IconChevronLeft size={16} />} disabled={selectedIndex <= 0} onClick={() => router.push(classHref(classId, sessions[selectedIndex - 1].id), { scroll: false })}>Sesi sebelumnya</Button><Button variant="default" size="xs" rightSection={<IconChevronRight size={16} />} disabled={selectedIndex >= sessions.length - 1} onClick={() => router.push(classHref(classId, sessions[selectedIndex + 1].id), { scroll: false })}>Sesi berikutnya</Button></Group>
            <SessionInfo course={course} session={selected} subject={subject} now={now} />
          </> : <Card className="surface-card" radius="lg" p="xl"><Title order={1} size="h2">Sesi tidak ditemukan</Title><Text c="dimmed" mt="sm">Sesi ini bukan bagian dari kelas tersebut. Pilih sesi lain dari daftar.</Text></Card>}
        </section>
      </div>;
}
