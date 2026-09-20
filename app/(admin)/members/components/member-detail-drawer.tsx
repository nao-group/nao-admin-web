"use client";

import { useEffect, useState } from "react";
import { Avatar, Badge, Box, Button, Divider, Drawer, Group, SimpleGrid, Skeleton, Stack, Text } from "@mantine/core";
import { IconMail } from "@tabler/icons-react";
import { DetailItem, StatusBadge } from "@/components/ui/admin";
import { formatDate } from "@/lib/format";
import { getMemberDetail } from "../api";
import type { MemberDetail } from "../types";
import { SubscriptionHistoryTimeline } from "./subscription-history-timeline";

export function MemberDetailDrawer({ memberId, onClose }: { memberId: string | null; onClose: () => void }) {
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!memberId) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void getMemberDetail(memberId)
        .then(setDetail)
        .catch(() => setDetail(null))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [memberId]);

  return (
    <Drawer opened={Boolean(memberId)} onClose={onClose} position="right" size="md" title={<Text className="section-title">Member details</Text>}>
      {loading && (
        <Stack gap="lg">
          <Skeleton height={80} radius="md" />
          <Skeleton height={90} radius="md" />
          <Skeleton height={140} radius="md" />
        </Stack>
      )}
      {!loading && detail && (
        <Stack gap="lg">
          <Group className="detail-hero" p="lg" wrap="nowrap">
            <Avatar color="yellow" radius="xl" size={58}>{detail.name.slice(0, 1)}</Avatar>
            <Box>
              <Text className="entity-title">{detail.name}</Text>
              <Text size="sm" c="dimmed">{detail.email}</Text>
            </Box>
          </Group>
          <SimpleGrid cols={2}>
            <DetailItem label="Member ID" value={detail.id} />
            <DetailItem label="Joined" value={formatDate(detail.joined)} />
            <DetailItem label="Product" value={detail.product ? <Badge variant="outline" color="dark">{detail.product}</Badge> : "—"} />
            <DetailItem label="Status" value={<StatusBadge status={detail.status} />} />
          </SimpleGrid>
          <Divider />
          <Box>
            <Text className="section-title" mb="md">Subscription history</Text>
            <SubscriptionHistoryTimeline history={detail.history} />
          </Box>
          <Button variant="light" color="dark" fullWidth leftSection={<IconMail size={16} />} component="a" href={`mailto:${detail.email}`}>
            Send email
          </Button>
        </Stack>
      )}
    </Drawer>
  );
}
