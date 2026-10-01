"use client";

import { useEffect, useState } from "react";
import { Box, Card, Grid, Group, Progress, SimpleGrid, Skeleton, Stack, Table, Text } from "@mantine/core";
import { IconCashBanknote, IconClockDollar, IconReceipt, IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { LineChart } from "@/components/charts";
import { MetricCard, PageHeader, StatusBadge } from "@/components/ui/admin";
import { formatCurrency, formatDate } from "@/lib/format";
import { getDashboard } from "./dashboard-api";
import type { DashboardData } from "./dashboard-types";
import type { IncomeSource, IncomeStatus } from "./income/types";

const SOURCE_COLOR: Record<IncomeSource, string> = { thinknao: "dark", studynao: "yellow", grant: "teal", other: "violet" };
const INCOME_STATUS_LABEL: Record<IncomeStatus, string> = { paid: "Paid", unpaid: "Unpaid", failed: "Failed" };

export default function FinanceOverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => { void getDashboard().then(setData).catch(() => setData(null)); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!data) {
    return <><PageHeader eyebrow="Finance" title="Ringkasan keuangan" description="Pantau pemasukan, pengeluaran, piutang, dan laba NAO Group dalam satu tempat." />
      <SimpleGrid cols={{ base: 1, xs: 2, xl: 4 }} mb="lg">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} height={110} radius="md" />)}</SimpleGrid>
      <Skeleton height={300} radius="md" />
    </>;
  }

  const { overview, cashflow, revenue_by_source: revenueBySource, recent_income: recentIncome, monthly_controls: monthlyControls } = data;
  const hasTrend = cashflow.trend_pct !== null;
  const trendDown = hasTrend && cashflow.trend_pct! < 0;

  return <>
    <PageHeader eyebrow="Finance" title="Ringkasan keuangan" description="Pantau pemasukan, pengeluaran, piutang, dan laba NAO Group dalam satu tempat." />
    <SimpleGrid cols={{ base: 1, xs: 2, xl: 4 }} mb="lg">
      <MetricCard label="Pemasukan" value={formatCurrency(overview.income)} delta="status paid" icon={IconCashBanknote} tone="gold" />
      <MetricCard label="Pengeluaran" value={formatCurrency(overview.expenses)} delta="status done" icon={IconReceipt} tone="purple" />
      <MetricCard label="Laba bersih" value={formatCurrency(overview.net_income)} icon={IconTrendingUp} tone="green" />
      <MetricCard label="Perlu dibayar" value={formatCurrency(overview.to_be_paid)} delta="mis. gaji karyawan yang belum ditransfer" icon={IconClockDollar} />
    </SimpleGrid>
    <Grid gap="lg" mb="lg">
      <Grid.Col span={{ base: 12, lg: 8 }}>
        <Card className="surface-card chart-card" p="lg" h="100%">
          <Group justify="space-between" mb="md">
            <Box><Text className="section-title">Laba kotor 6 bulan</Text><Text size="xs" c="dimmed">Pemasukan bersih (paid) dikurangi pengeluaran (done) per bulan</Text></Box>
            {hasTrend && <Group gap={4}>{trendDown ? <IconTrendingDown size={16} color="#c0392b" /> : <IconTrendingUp size={16} color="#16836b" />}<Text fw={700} c={trendDown ? "red.7" : "teal.8"}>Tren {cashflow.trend_pct! > 0 ? "+" : ""}{cashflow.trend_pct}%</Text></Group>}
          </Group>
          <LineChart data={cashflow.gross_profit} labels={cashflow.labels} color="#16836b" fill="#d6f5ed" formatter={(value) => formatCurrency(value)} />
          <Text size="xs" c="dimmed" mt="sm">Dibanding 6 bulan sebelumnya (bulan ke-7 hingga ke-12 ke belakang).</Text>
        </Card>
      </Grid.Col>
      <Grid.Col span={{ base: 12, lg: 4 }}>
        <Card className="surface-card" p="lg" h="100%">
          <Text className="section-title">Revenue per sumber</Text>
          <Text size="xs" c="dimmed" mb="xl">Hanya transaksi berstatus paid</Text>
          <Stack gap="lg">{revenueBySource.map((item) => <Box key={item.source}>
            <Group justify="space-between" mb={6}><Text size="sm" fw={600}>{item.label}</Text><Text size="sm" fw={700}>{formatCurrency(item.value)}</Text></Group>
            <Progress value={item.percentage} color={SOURCE_COLOR[item.source]} radius="xl" />
            <Text size="xs" c="dimmed" mt={5}>{item.percentage}% dari revenue</Text>
          </Box>)}</Stack>
        </Card>
      </Grid.Col>
    </Grid>
    <Grid gap="lg">
      <Grid.Col span={{ base: 12, lg: 8 }}>
        <Card className="surface-card table-card" p={0}>
          <Box p="lg"><Text className="section-title">Pemasukan terbaru</Text><Text size="xs" c="dimmed">5 transaksi terbaru — sinkron DOKU dan pencatatan manual</Text></Box>
          <Table verticalSpacing="md" horizontalSpacing="lg">
            <Table.Thead><Table.Tr><Table.Th>Referensi</Table.Th><Table.Th>Pembayar</Table.Th><Table.Th>Sumber</Table.Th><Table.Th>Status</Table.Th><Table.Th ta="right">Bersih</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>{recentIncome.map((item) => <Table.Tr key={item.id}>
              <Table.Td><Text size="xs" ff="monospace" fw={600}>{item.reference}</Text><Text size="xs" c="dimmed">{formatDate(item.occurred_at)}</Text></Table.Td>
              <Table.Td><Text size="sm" fw={600}>{item.payer}</Text></Table.Td>
              <Table.Td>{item.source === "other" ? item.custom_source || "Lainnya" : item.source}</Table.Td>
              <Table.Td><StatusBadge status={INCOME_STATUS_LABEL[item.status]} /></Table.Td>
              <Table.Td ta="right" fw={700}>{formatCurrency(item.net_amount)}</Table.Td>
            </Table.Tr>)}
            {!recentIncome.length && <Table.Tr><Table.Td colSpan={5}><Text size="sm" c="dimmed" ta="center" py="md">Belum ada pemasukan.</Text></Table.Td></Table.Tr>}
            </Table.Tbody>
          </Table>
        </Card>
      </Grid.Col>
      <Grid.Col span={{ base: 12, lg: 4 }}>
        <Card className="surface-card" p="lg" h="100%">
          <Text className="section-title">Kontrol bulan ini</Text>
          <Stack gap="md" mt="lg">
            <Box className="finance-check">
              <Text size="sm" fw={600}>Revenue tercatat</Text>
              <Text size="lg" fw={700} mt={4}>{formatCurrency(monthlyControls.revenue_this_month.amount)}</Text>
              <Text size="xs" c="dimmed" mt={2}>{monthlyControls.revenue_this_month.count} transaksi tercatat bulan ini</Text>
            </Box>
            <Box className="finance-check">
              <Text size="sm" fw={600}>Pengeluaran pending</Text>
              <Text size="lg" fw={700} mt={4}>{formatCurrency(monthlyControls.pending_expenses.amount)}</Text>
              <Text size="xs" c="dimmed" mt={2}>{monthlyControls.pending_expenses.count} pembayaran masih outstanding dari Nao</Text>
            </Box>
            <Box className="finance-check">
              <Text size="sm" fw={600}>Expense trend bulan ini</Text>
              <Group justify="space-between" mt={4}><Text size="sm" c="dimmed">Sudah dibayar</Text><Text fw={700}>{formatCurrency(monthlyControls.expense_trend_this_month.paid)}</Text></Group>
              <Group justify="space-between"><Text size="sm" c="dimmed">Masih perlu dibayar</Text><Text fw={700}>{formatCurrency(monthlyControls.expense_trend_this_month.pending)}</Text></Group>
            </Box>
          </Stack>
        </Card>
      </Grid.Col>
    </Grid>
  </>;
}
