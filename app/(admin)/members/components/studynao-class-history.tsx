"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Anchor, Badge, Box, Card, Group, Pagination, Skeleton, Stack, Table, Text } from "@mantine/core";
import { getMemberStudyClassHistory } from "../api";
import type { MemberStudyClassHistory } from "../types";

const statuses = {
  not_started: { label: "Belum dimulai", color: "yellow" },
  ongoing: { label: "Berlangsung", color: "blue" },
  completed: { label: "Selesai", color: "teal" },
  cancelled: { label: "Dibatalkan", color: "gray" },
};
const date = (value: string) => new Date(value.length === 10 ? `${value}T12:00:00+07:00` : value)
  .toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });

export function StudyNaoClassHistory({ memberId }: { memberId: string }) {
  return <History key={memberId} memberId={memberId} />;
}

function History({ memberId }: { memberId: string }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MemberStudyClassHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    getMemberStudyClassHistory(memberId, page, controller.signal)
      .then((result) => { if (!controller.signal.aborted) { setData(result); setPage(result.page); } })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Riwayat kelas tidak dapat dimuat."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [memberId, page]);
  return <Card className="surface-card" p="lg">
    <Text className="section-title" mb="md">Riwayat kelas StudyNao</Text>
    {loading ? <Stack><Skeleton height={50} /><Skeleton height={50} /></Stack> : error ? <Alert color="red">{error}</Alert> : !data?.items.length ?
      <Text size="sm" c="dimmed">Belum ada kelas StudyNao yang diikuti.</Text> : <>
        <Table.ScrollContainer minWidth={820}>
          <Table verticalSpacing="md" horizontalSpacing="md">
            <Table.Thead><Table.Tr><Table.Th>Kelas</Table.Th><Table.Th>Guru</Table.Th><Table.Th>Periode (WIB)</Table.Th><Table.Th>Progres sesi</Table.Th><Table.Th>Status</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>{data.items.map((item) => <Table.Tr key={item.id}>
              <Table.Td><Anchor component={Link} href={`/studynao/classes/${item.id}`} fw={700} size="sm">{item.code}</Anchor>
                <Text size="sm" mt={3}>{item.subject_name}</Text>
                <Text size="xs" c="dimmed">{item.class_type === "private" ? "Privat" : "Group"} · {item.teaching_language} · {item.duration_minutes} menit/sesi</Text></Table.Td>
              <Table.Td><Text size="sm">{item.teacher_name || "—"}</Text></Table.Td>
              <Table.Td><Text size="sm">{date(item.first_start || item.first_date)} – {item.last_end ? date(item.last_end) : "—"}</Text></Table.Td>
              <Table.Td><Text size="sm" fw={600}>{item.completed_sessions}/{item.active_sessions} selesai</Text><Text size="xs" c="dimmed">Paket {item.session_count} sesi</Text></Table.Td>
              <Table.Td><Badge color={statuses[item.lifecycle_status].color} variant="light">{statuses[item.lifecycle_status].label}</Badge></Table.Td>
            </Table.Tr>)}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        <Group justify="space-between" mt="md"><Text size="sm" c="dimmed">{data.total} kelas</Text><Box><Pagination total={Math.ceil(data.total / data.page_size)} value={data.page} onChange={(next) => { setLoading(true); setError(""); setPage(next); }} /></Box></Group>
      </>}
  </Card>;
}
