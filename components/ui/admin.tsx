"use client";

import { Badge, Box, Card, Group, Text, Title } from "@mantine/core";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { statusColor } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  return <Badge color={statusColor(status)} variant="light" size="sm" leftSection={<span className="status-dot" />}>{status}</Badge>;
}

const PAGE_TITLES: Record<string, string> = {
  "Karyawan & guru": "Karyawan & Guru",
  "Email pengumuman": "Email Pengumuman",
  "Announcement emails": "Email Pengumuman",
  "Laporan soal": "Laporan Soal",
  "Otomasi pengeluaran": "Otomasi Pengeluaran",
  "Ringkasan keuangan": "Ringkasan Finance",
  "Ekstraktor soal": "Ekstraktor Soal",
  "Kode referral": "Kode Referral",
  "Banner pengumuman": "Banner Pengumuman",
  "Payroll & slip gaji": "Payroll & Slip Gaji",
  "DOKU payment fee": "Tarif DOKU",
  "Galeri gambar soal": "Galeri Gambar Soal",
  Members: "Member",
};

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <Group justify="space-between" align="flex-end" mb={26} gap="lg"><Box><Text className="eyebrow">{eyebrow}</Text><Title order={1} className="editorial-title page-title">{PAGE_TITLES[title] ?? title}</Title><Text c="dimmed" mt={6}>{description}</Text></Box>{action}</Group>;
}

type MetricCardProps = {
  label: string;
  value: string;
  delta?: string;
  deltaPct?: number | null;
  icon: React.ElementType;
  tone?: "navy" | "gold" | "green" | "purple";
};

export function MetricCard({ label, value, delta, deltaPct, icon: Icon, tone = "navy" }: MetricCardProps) {
  const hasPercentage = deltaPct !== undefined && deltaPct !== null;
  const isDown = hasPercentage && deltaPct < 0;
  const comparison = hasPercentage ? `${deltaPct > 0 ? "+" : ""}${deltaPct}%` : delta;
  const showComparisonLabel = hasPercentage || Boolean(delta && /^[+-]/.test(delta));
  return <Card className="metric-card" p="lg"><Group justify="space-between" align="flex-start" wrap="nowrap"><Box className="metric-copy"><Text size="xs" fw={600} c="dimmed" tt="uppercase" lts=".05em">{label}</Text><Text className="metric-value">{value}</Text></Box><Box className={`metric-icon ${tone}`}><Icon size={19} stroke={1.8} aria-hidden="true" /></Box></Group>{comparison && <Group gap={6} mt="md">{isDown ? <IconTrendingDown size={14} color="#c0392b" aria-hidden="true" /> : <IconTrendingUp size={14} color="#16836b" aria-hidden="true" />}<Text size="xs" c={isDown ? "red.8" : "teal.8"} fw={600}>{comparison}</Text>{showComparisonLabel && <Text size="xs" c="dimmed">dibanding bulan lalu</Text>}</Group>}</Card>;
}

export function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return <Box className="detail-item"><Text size="xs" c="dimmed" mb={4}>{label}</Text>{typeof value === "string" ? <Text size="sm" fw={600}>{value}</Text> : value}</Box>;
}
