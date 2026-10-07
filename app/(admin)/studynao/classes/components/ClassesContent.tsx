"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useDebouncedValue } from "@mantine/hooks";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, Group, Pagination, Progress, Select, SimpleGrid, Skeleton, Stack, Table, Text, TextInput } from "@mantine/core";
import { IconCalendarEvent, IconCheck, IconClock, IconRefresh, IconSchool, IconSearch } from "@tabler/icons-react";
import { MetricCard, PageHeader } from "@/components/ui/admin";
import { CLASS_LABELS, COLORS, classHref, formatDate } from "../data";
import { useClassesList } from "./use-classes-list";
import styles from "../classes.module.css";

export function ClassesContent() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  // Keep the page reset and search change in the same debounced request.
  const input = useMemo(() => ({ page, pageSize, search, classType: type, status, offeringId: subject }), [page, pageSize, search, type, status, subject]);
  const [request] = useDebouncedValue(input, 250);
  const { data, error, loading: fetching, reload } = useClassesList(request);
  const loading = fetching || input !== request;
  const visible = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = loading ? page : data?.page ?? page;

  return <Stack gap="lg">
    <PageHeader eyebrow="STUDYNAO" title="StudyNao Classes" description="Daftar kelas privat dan grup, progres sesi, serta kelengkapan log pengajaran."
      action={<Button variant="default" leftSection={<IconRefresh size={16} />} loading={loading} onClick={reload}>Refresh</Button>} />
    {error && <Alert color="red" title="Data belum dapat dimuat">{error}<Button size="xs" variant="light" color="red" ml="md" onClick={reload}>Coba lagi</Button></Alert>}
    {!data ? loading && <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>{[0, 1, 2, 3].map((item) => <Skeleton key={item} height={150} radius="lg" />)}</SimpleGrid> : <>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <MetricCard label="Semua kelas" value={String(data.stats.total)} icon={IconSchool} />
        <MetricCard label="Not started" value={String(data.stats.not_started)} icon={IconClock} />
        <MetricCard label="Ongoing" value={String(data.stats.ongoing)} icon={IconCalendarEvent} tone="gold" />
        <MetricCard label="Completed" value={String(data.stats.completed)} icon={IconCheck} tone="green" />
      </SimpleGrid>
      <Card className="surface-card" radius="lg" p="lg">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="lg">
          <TextInput label="Cari kelas" placeholder="Kode kelas, guru, murid, subjek…" leftSection={<IconSearch size={16} />} value={search} onChange={(event) => { setSearch(event.currentTarget.value); setPage(1); }} />
          <Select label="Tipe kelas" placeholder="Semua tipe" clearable data={[{ value: "private", label: "Private" }, { value: "group", label: "Group" }]} value={type} onChange={(value) => { setType(value); setPage(1); }} />
          <Select label="Status kelas" placeholder="Semua status" clearable data={Object.entries(CLASS_LABELS).map(([value, label]) => ({ value, label }))} value={status} onChange={(value) => { setStatus(value); setPage(1); }} />
          <Select label="Subjek" placeholder="Semua subjek" clearable searchable data={data.subjects.map((item) => ({ value: String(item.id), label: item.name }))} value={subject} onChange={(value) => { setSubject(value); setPage(1); }} />
        </SimpleGrid>
        <Text size="sm" c="dimmed" mb="md">Status kelas mengikuti periode jadwal dalam WIB. Sesi dihitung completed setelah log guru disubmit.</Text>
        {loading ? <Stack gap="sm" py="md" aria-label="Memuat halaman kelas">{[0, 1, 2].map((item) => <Skeleton key={item} height={75} />)}</Stack> : error ? <Text size="sm" c="dimmed" py="xl">Coba muat ulang untuk melihat kelas pada halaman ini.</Text> : visible.length ? <Table.ScrollContainer minWidth={850}><Table verticalSpacing="md" highlightOnHover>
          <Table.Thead><Table.Tr><Table.Th>Kelas</Table.Th><Table.Th>Guru & murid</Table.Th><Table.Th>Periode</Table.Th><Table.Th>Status</Table.Th><Table.Th>Progres sesi</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>{visible.map((row) => <Table.Tr key={row.id} className={styles.classRow} onClick={(event) => { if (!(event.target as HTMLElement).closest("a")) router.push(classHref(row.id)); }}>
            <Table.Td><Link href={classHref(row.id)} className={styles.classLink}>{row.code}</Link><Text size="sm" mt={5} fw={600}>{row.subject_name}</Text><Text size="xs" c="dimmed" mt={3}>{row.class_type === "private" ? "Private" : "Group"} · {row.teaching_language}</Text></Table.Td>
            <Table.Td><Text size="sm" fw={600}>{row.teacher?.full_name ?? "Guru belum ditentukan"}</Text><Text size="xs" c="dimmed" mt={4} maw={250}>{row.student_names.length ? row.student_names.join(", ") : "Belum ada murid"}</Text><Text size="xs" c="dimmed" mt={4}>{row.student_ids.length}/{row.capacity} murid</Text></Table.Td>
            <Table.Td><Text size="sm">{formatDate(row.first_start ?? row.first_date)}</Text><Text size="xs" c="dimmed" mt={4}>s.d. {row.last_end ? formatDate(row.last_end) : "Belum ada sesi"}</Text></Table.Td>
            <Table.Td><Badge variant="light" color={COLORS[row.lifecycle_status]}>{CLASS_LABELS[row.lifecycle_status]}</Badge></Table.Td>
            <Table.Td miw={160}><Text size="sm" fw={600}>{row.completed_sessions}/{row.active_sessions} completed</Text><Progress value={row.active_sessions ? row.completed_sessions / row.active_sessions * 100 : 0} color="teal" size="sm" mt={8} aria-label={`Progres sesi ${row.code}`} />{row.awaiting_logs > 0 && <Text size="xs" c="orange.8" mt={7}>{row.awaiting_logs} sesi menunggu log</Text>}</Table.Td>
          </Table.Tr>)}</Table.Tbody>
        </Table></Table.ScrollContainer> : <Stack align="center" py="xl" gap="sm"><IconSchool size={32} aria-hidden="true" /><Text fw={600}>{data.stats.total ? "Tidak ada kelas yang cocok" : "Belum ada kelas"}</Text><Text size="sm" c="dimmed">{data.stats.total ? "Ubah pencarian atau filter untuk melihat kelas lainnya." : "Kelas yang dibuat melalui penjadwalan akan muncul di sini."}</Text>{data.stats.total > 0 && <Button variant="light" onClick={() => { setSearch(""); setType(null); setStatus(null); setSubject(null); setPage(1); }}>Reset filter</Button>}</Stack>}
        <Group className="pagination-bar" justify="space-between" mt="lg" pt="md" gap="md">
          <Group gap="md">
            <Text size="xs" c="dimmed" role="status">Menampilkan {total ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, total)} dari {total} kelas</Text>
            <Select aria-label="Jumlah kelas per halaman" w={160} size="xs" allowDeselect={false}
              data={[15, 30, 50].map((value) => ({ value: String(value), label: `${value} per halaman` }))}
              value={String(pageSize)} onChange={(value) => { if (value) { setPageSize(Number(value)); setPage(1); } }} />
          </Group>
          <Pagination disabled={loading} value={currentPage} onChange={setPage} total={pages} size="sm" siblings={1} boundaries={1} />
        </Group>
      </Card>
    </>}
  </Stack>;
}
