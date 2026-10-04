"use client";

import { use, useEffect, useState } from "react";
import { Badge, Box, Card, Group, SimpleGrid, Skeleton, Stack, Text } from "@mantine/core";
import { DetailItem, StatusBadge } from "@/components/ui/admin";
import { PreviewableAvatar } from "@/components/ui/profile-photo-preview";
import { formatDate } from "@/lib/format";
import { getMemberDetail } from "../api";
import type { MemberDetail } from "../types";
import { SubscriptionHistoryTimeline } from "../components/subscription-history-timeline";

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getMemberDetail(id)
      .then((member) => { if (active) setDetail(member); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Detail member tidak dapat dimuat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  return <>
    {loading && <Stack gap="lg"><Skeleton height={110} radius="md" /><Skeleton height={190} radius="md" /><Skeleton height={220} radius="md" /></Stack>}
    {!loading && error && <Card className="surface-card" p="lg"><Text c="red">{error}</Text></Card>}
    {!loading && detail && <Stack gap="lg">
      <Card className="surface-card" p="lg">
        <Group className="detail-hero" p="lg" wrap="nowrap" mb="lg">
          <PreviewableAvatar src={detail.avatar_url} name={detail.name} fallback={detail.name.slice(0, 1)} size={64} />
          <Box><Text className="entity-title">{detail.name}</Text><Text size="sm" c="dimmed">{detail.email}</Text></Box>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          <DetailItem label="ID member" value={detail.id} />
          <DetailItem label="Bergabung" value={formatDate(detail.joined)} />
          <DetailItem label="Produk" value={detail.product ? <Badge variant="outline" color="dark">{detail.product}</Badge> : "—"} />
          <DetailItem label="Plan" value={detail.plan || "—"} />
          <DetailItem label="Status" value={<StatusBadge status={detail.status} />} />
        </SimpleGrid>
      </Card>
      <Card className="surface-card" p="lg">
        <Text className="section-title" mb="md">Pendidikan & tujuan</Text>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          <DetailItem label="Grade" value={detail.grade || "—"} />
          <DetailItem label="Provinsi" value={detail.province || "—"} />
          <DetailItem label="Sekolah saat ini" value={detail.current_school || "—"} />
          <DetailItem label="Universitas impian" value={detail.dream_university || "—"} />
          <DetailItem label="Jurusan tujuan" value={detail.target_major || "—"} />
        </SimpleGrid>
      </Card>
      {detail.studynao?.role === "student" && <Card className="surface-card" p="lg"><Text className="section-title" mb="md">StudyNao · Murid</Text><SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}><DetailItem label="Status" value={detail.studynao.status} /><DetailItem label="WhatsApp" value={detail.studynao.profile?.whatsapp || "—"} /><DetailItem label="Jenjang studi" value={detail.studynao.profile?.study_level || "—"} /><DetailItem label="Email orang tua" value={detail.studynao.profile?.parent_email || "—"} /></SimpleGrid></Card>}
      <Card className="surface-card" p="lg">
        <Text className="section-title" mb="md">Riwayat subscription</Text>
        <SubscriptionHistoryTimeline history={detail.history} />
      </Card>
    </Stack>}
  </>;
}
