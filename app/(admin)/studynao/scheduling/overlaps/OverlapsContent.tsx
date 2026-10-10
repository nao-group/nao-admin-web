"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, Group, Loader, Select, Stack, Text, Title } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { IconCalendarPlus, IconX } from "@tabler/icons-react";
import { refreshAdminNotifications } from "@/lib/teacher-approvals";
import { finalizePrivateClass, getMatchesForDate, getOverlapData } from "./api";
import { slotKey, slotLabel } from "./slot-utils";
import type { MatchResponse, Overview, Slot } from "./types";
import { WeeklyOverlapTimetable } from "./WeeklyOverlapTimetable";
import styles from "./overlaps.module.css";

export function OverlapsContent({ requestId }: { requestId: number }) {
  const router = useRouter();
  const matchRevision = useRef(0);
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Slot[]>([]);
  const [firstDate, setFirstDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [matchError, setMatchError] = useState("");
  const [matchLoading, setMatchLoading] = useState(false);

  useEffect(() => {
    let active = true;
    getOverlapData(requestId).then(([matches, list]) => {
      if (!active) return;
      setResult(matches);
      setOverview(list);
      const eligible = matches.eligible_teachers ?? matches.matches;
      setTeacherId(String((eligible.find((teacher) => teacher.slots.length) ?? eligible[0])?.teacher_staff_id ?? "") || null);
      setFirstDate(matches.first_date ?? matches.request.preferred_start_date);
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Jadwal yang cocok belum dapat ditemukan."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestId]);

  const teachers = result?.eligible_teachers ?? result?.matches ?? [];
  const teacher = teachers.find((item) => String(item.teacher_staff_id) === teacherId);
  const detailedAvailability = Array.isArray(result?.student_availability) && Array.isArray(teacher?.teacher_availability);
  const required = result ? result.program.session_count / 4 : 0;
  const subject = overview?.subjects.find((item) => item.id === result?.request.offering_id)?.name ?? "Mata pelajaran";
  const student = overview?.requests.find((item) => item.id === requestId)?.student?.full_name ?? result?.request.student_user_id ?? "Murid";

  async function changeFirstDate(value: string | null) {
    const date = value ?? "";
    setFirstDate(date);
    setSelected([]);
    setMatchError("");
    const revision = ++matchRevision.current;
    if (!date) return;
    setMatchLoading(true);
    try {
      const matches = await getMatchesForDate(requestId, date);
      if (revision === matchRevision.current) setResult(matches);
    } catch (cause) {
      if (revision === matchRevision.current) setMatchError(cause instanceof Error ? cause.message : "Ketersediaan jadwal belum dapat diperiksa.");
    } finally { if (revision === matchRevision.current) setMatchLoading(false); }
  }

  function toggle(slot: Slot) {
    if (matchLoading || matchError || !teacher?.slots.some(item => slotKey(item) === slotKey(slot))) return;
    if (selected.some((item) => slotKey(item) === slotKey(slot))) { setSelected((items) => items.filter((item) => slotKey(item) !== slotKey(slot))); return; }
    if (selected.length >= required) { notifications.show({ color: "yellow", message: `Pilih tepat ${required} jam kelas mingguan. Hapus satu sebelum menambah yang lain.` }); return; }
    if (selected.some((item) => item.weekday === slot.weekday && item.start_minute < slot.end_minute && slot.start_minute < item.end_minute)) {
      notifications.show({ color: "yellow", message: "Jam kelas pada hari yang sama tidak boleh bertabrakan." }); return;
    }
    setSelected((items) => [...items, slot].sort((a, b) => a.weekday - b.weekday || a.start_minute - b.start_minute));
  }

  async function finalize() {
    if (!result || !teacher || !firstDate || matchLoading || matchError || selected.length !== required) return;
    setSaving(true);
    try {
      await finalizePrivateClass({ request_id: requestId, program_id: result.request.program_id, offering_id: result.request.offering_id, teacher_staff_id: teacher.teacher_staff_id, first_date: firstDate, slots: selected });
      notifications.show({ color: "teal", message: "Kelas privat beserta seluruh periodenya berhasil dijadwalkan." });
      refreshAdminNotifications();
      router.push("/studynao/scheduling");
    } catch (cause) { notifications.show({ color: "red", message: cause instanceof Error ? cause.message : "Kelas belum dapat dibuat." }); }
    finally { setSaving(false); }
  }

  return <Stack gap="lg">
    {loading && <Card withBorder p="xl"><Group><Loader size="sm" /><Text>Memuat ketersediaan mingguan…</Text></Group></Card>}
    {!loading && (error || !result) && <Alert color="red" title="Jadwal yang cocok tidak tersedia">{error || "Permintaan privat ini tidak ditemukan."}</Alert>}
    {result && <>
      <Card withBorder radius="lg" p="lg"><Group justify="space-between" align="start" gap="md"><div><Title order={2} size="h3">{student} · {subject}</Title><Text c="dimmed" size="sm" mt={4}>{result.program.subject} · {result.program.teaching_language} · {result.program.session_count} sesi × {result.program.duration_minutes} menit</Text><Text c="dimmed" size="sm">Tanggal kelas pertama yang diinginkan: {result.request.preferred_start_date}</Text></div><Badge color="yellow" variant="light">Permintaan tertunda #{requestId}</Badge></Group></Card>
      <Card withBorder radius="lg" p="lg"><Stack gap="md"><Group align="end" gap="md"><Select label="Guru" description="Guru aktif yang memenuhi syarat, termasuk yang irisan jadwalnya belum cukup panjang" placeholder="Pilih guru" data={teachers.map((item) => ({ value: String(item.teacher_staff_id), label: `${item.teacher_name} · ${item.slots.length} jam mulai valid` }))} value={teacherId} onChange={(value) => { setTeacherId(value); setSelected([]); }} searchable style={{ flex: 1, minWidth: 240 }} /><DatePickerInput label="Tanggal kelas pertama" placeholder="Pilih tanggal" minDate={result.request.preferred_start_date} value={firstDate || null} onChange={(value) => void changeFirstDate(value)} valueFormat="DD MMMM YYYY" clearable={false} style={{ minWidth: 220 }} /></Group>
        {matchLoading && <Loader size="xs" />}
        {matchError && <Alert color="red">{matchError}</Alert>}
        <div className={styles.legend}>{detailedAvailability && <><span className={styles.legendItem}><i className={`${styles.swatch} ${styles.studentSwatch}`} />Murid tersedia</span><span className={styles.legendItem}><i className={`${styles.swatch} ${styles.teacherSwatch}`} />Guru tersedia</span></>}<span className={styles.legendItem}><i className={`${styles.swatch} ${styles.overlapSwatch}`} />{detailedAvailability ? "Irisan jadwal" : "Rentang kelas valid"}</span><span className={styles.legendItem}><i className={`${styles.swatch} ${styles.selectedSwatch}`} />Jam kelas terpilih</span><span className={styles.legendItem}><i className={`${styles.swatch} ${styles.busySwatch}`} />Guru sudah mengajar</span></div>
        <Text size="sm" c="dimmed">Jadwal berlaku Senin–Minggu, pukul 07:00–22:00 WIB. Jam guru yang sudah terisi selama periode 4 minggu tidak dapat dipilih. Titik emas menandai jam mulai yang valid untuk kelas penuh {result.program.duration_minutes} menit. Arahkan kursor untuk melihat durasi lengkapnya, lalu klik untuk memilih.</Text>
        {teacher && !detailedAvailability && <Alert color="blue">Detail ketersediaan murid dan guru sementara tidak tersedia. Jadwal tetap menampilkan rentang yang muat untuk durasi kelas penuh.</Alert>}
        {!teachers.length && <Alert color="yellow">Tidak ada guru aktif yang memenuhi syarat untuk mata pelajaran, bahasa, dan tipe kelas privat ini.</Alert>}
        {teacher && !teacher.slots.length && <Alert color="yellow">Guru ini tidak memiliki jam bebas yang cukup panjang tanpa bentrok dengan kelas lain untuk sesi {result.program.duration_minutes} menit. Bandingkan blok ketersediaan berwarna atau pilih guru lain.</Alert>}
        {teacher && teacher.slots.length > 0 && <Text size="sm" fw={600}>{teacher.teacher_name}: {teacher.slots.length} jam mulai valid untuk kelas {result.program.duration_minutes} menit.</Text>}
        <WeeklyOverlapTimetable student={result.student_availability ?? []} teacher={teacher} selected={selected} duration={result.program.duration_minutes} detailedAvailability={detailedAvailability} onToggle={toggle} />
      </Stack></Card>
      <Card withBorder radius="lg" p="lg"><Stack gap="md"><Group justify="space-between"><div><Text fw={700}>Jam kelas mingguan</Text><Text size="sm" c="dimmed">Pilih {required} jam yang tidak bertabrakan · {selected.length} dari {required} terpilih</Text></div><Button variant="subtle" size="xs" disabled={!selected.length} onClick={() => setSelected([])}>Hapus pilihan</Button></Group>
        {selected.length ? <div className={styles.selectedList}>{selected.map((slot) => <Badge key={slotKey(slot)} size="lg" variant="light" color="yellow" rightSection={<button type="button" aria-label={`Hapus ${slotLabel(slot)}`} onClick={() => toggle(slot)} style={{ background: "none", border: 0, cursor: "pointer" }}><IconX size={12} /></button>}>{slotLabel(slot)}</Badge>)}</div> : <Text size="sm" c="dimmed">Pilih guru lalu pilih jam mulai dari jadwal di atas.</Text>}
        <Group justify="flex-end"><Button leftSection={<IconCalendarPlus size={16} />} loading={saving} disabled={!teacher || !firstDate || matchLoading || Boolean(matchError) || selected.length !== required} onClick={() => void finalize()}>Selesaikan kelas privat</Button></Group>
      </Stack></Card>
    </>}
  </Stack>;
}
