"use client";

import { Badge, Box, Card, Group, Text, Title } from "@mantine/core";
import { IconTrendingUp } from "@tabler/icons-react";
import { statusColor } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  return <Badge color={statusColor(status)} variant="light" size="sm" leftSection={<span className="status-dot" />}>{status}</Badge>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <Group justify="space-between" align="flex-end" mb={26} gap="lg"><Box><Text className="eyebrow">{eyebrow}</Text><Title order={1} className="editorial-title page-title">{title}</Title><Text c="dimmed" mt={6}>{description}</Text></Box>{action}</Group>;
}

export function MetricCard({ label, value, delta, icon: Icon, tone = "navy" }: { label: string; value: string; delta: string; icon: React.ElementType; tone?: "navy" | "gold" | "green" | "purple" }) {
  return <Card className="metric-card" p="lg"><Group justify="space-between" align="flex-start" wrap="nowrap"><Box className="metric-copy"><Text size="xs" fw={600} c="dimmed" tt="uppercase" lts=".05em">{label}</Text><Text className="metric-value">{value}</Text></Box><Box className={`metric-icon ${tone}`}><Icon size={19} stroke={1.8} aria-hidden="true" /></Box></Group><Group gap={6} mt="md"><IconTrendingUp size={14} color="#16836b" aria-hidden="true" /><Text size="xs" c="teal.8" fw={600}>{delta}</Text><Text size="xs" c="dimmed">vs last month</Text></Group></Card>;
}

export function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return <Box className="detail-item"><Text size="xs" c="dimmed" mb={4}>{label}</Text>{typeof value === "string" ? <Text size="sm" fw={600}>{value}</Text> : value}</Box>;
}
