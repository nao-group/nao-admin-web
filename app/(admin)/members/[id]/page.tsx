"use client";

import { use, useEffect, useState } from "react";
import { Box, Card, Group, SimpleGrid, Skeleton, Stack, Text } from "@mantine/core";
import { DetailItem, StatusBadge } from "@/components/ui/admin";
import { PreviewableAvatar } from "@/components/ui/profile-photo-preview";
import { formatDate } from "@/lib/format";
import { getMemberDetail } from "../api";
import type { MemberDetail } from "../types";
import { MemberProducts } from "../components/member-products";
import { StudyNaoClassHistory } from "../components/studynao-class-history";
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
          <DetailItem label="Produk" value={<MemberProducts products={detail.products} product={detail.product} />} />
          <DetailItem label="Plan" value={detail.plan || "—"} />
          <DetailItem label="Status ThinkNao" value={<StatusBadge status={detail.status} />} />
          {detail.studynao?.role === "student" && <>
            <DetailItem label="Status StudyNao" value={<StatusBadge status={({ active: "Active", inactive: "Inactive", onboarding: "Pending" }[detail.studynao.status] ?? detail.studynao.status)} />} />
            <DetailItem label="WhatsApp" value={detail.studynao.profile?.whatsapp || "—"} />
            <DetailItem label="Email orang tua" value={detail.studynao.profile?.parent_email || "—"} />
          </>}
        </SimpleGrid>
      </Card>
      <Card className="surface-card" p="lg">
        <Text className="section-title" mb="md">Pendidikan & tujuan</Text>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          <DetailItem label="Grade" value={detail.grade || detail.studynao?.profile?.study_level || "—"} />
          <DetailItem label="Provinsi" value={detail.province || "—"} />
          <DetailItem label="Sekolah saat ini" value={detail.current_school || "—"} />
          <DetailItem label="Universitas impian" value={detail.dream_university || "—"} />
          <DetailItem label="Jurusan tujuan" value={detail.target_major || "—"} />
        </SimpleGrid>
      </Card>
      <Card className="surface-card" p="lg">
        <Text className="section-title" mb="md">Riwayat subscription ThinkNao</Text>
        <SubscriptionHistoryTimeline history={detail.history} />
      </Card>
      <StudyNaoClassHistory memberId={detail.id} />
    </Stack>}
  </>;
}
