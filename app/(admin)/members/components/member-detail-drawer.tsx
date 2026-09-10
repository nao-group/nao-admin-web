"use client";

import { Avatar, Badge, Box, Button, Divider, Drawer, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconMail } from "@tabler/icons-react";
import { DetailItem, StatusBadge } from "@/components/ui/admin";
import { formatDate } from "@/lib/format";
import type { Member } from "@/types/admin";

export function MemberDetailDrawer({ member, onClose }: { member: Member | null; onClose: () => void }) {
  return <Drawer opened={Boolean(member)} onClose={onClose} position="right" size="md" title={<Text className="section-title">Member details</Text>}>{member && <Stack gap="lg"><Group className="detail-hero" p="lg" wrap="nowrap"><Avatar color="yellow" radius="xl" size={58}>{member.name.slice(0, 1)}</Avatar><Box><Text className="entity-title">{member.name}</Text><Text size="sm" c="dimmed">{member.email}</Text></Box></Group><SimpleGrid cols={2}><DetailItem label="Member ID" value={member.id} /><DetailItem label="Joined" value={formatDate(member.joined)} /><DetailItem label="Product" value={<Badge variant="outline" color={member.product === "ThinkNAO" ? "dark" : "yellow"}>{member.product}</Badge>} /><DetailItem label="Status" value={<StatusBadge status={member.status} />} /></SimpleGrid><Divider /><Box><Text className="section-title" mb="md">Subscription</Text><Stack gap="sm"><DetailItem label="Current plan" value={member.plan} /><DetailItem label="Billing cycle" value={member.plan.includes("Annual") ? "Annual" : "Monthly"} /><DetailItem label="Account health" value={member.status === "Active" ? "Good standing" : member.status === "Trial" ? "Trial period" : "Needs attention"} /></Stack></Box><Button variant="light" color="dark" fullWidth leftSection={<IconMail size={16} />}>Send email</Button></Stack>}</Drawer>;
}
