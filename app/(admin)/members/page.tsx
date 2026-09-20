"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, Badge, Box, Card, Group, Pagination, ScrollArea, Select, SimpleGrid, Skeleton, Table, Text, TextInput } from "@mantine/core";
import { IconChartBar, IconSearch, IconSparkles, IconTrendingUp, IconUsers } from "@tabler/icons-react";
import { DistributionDonut, LineChart } from "@/components/charts";
import { MetricCard, PageHeader, StatusBadge } from "@/components/ui/admin";
import { formatDate } from "@/lib/format";
import { getGrowth, getProductDistribution, getStats, listMembers } from "./api";
import type { MemberGrowth, MemberRow, MemberStats, ProductDistribution } from "./types";
import { MemberDetailDrawer } from "./components/member-detail-drawer";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PAGE_SIZE = 10;

function yearOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let y = currentYear + 1; y >= currentYear - 3; y -= 1) years.push(String(y));
  return years;
}

export default function MembersPage() {
  const now = useMemo(() => new Date(), []);
  const [cardYear, setCardYear] = useState(String(now.getFullYear()));
  const [cardMonth, setCardMonth] = useState(String(now.getMonth() + 1));
  const [growthYear, setGrowthYear] = useState(String(now.getFullYear()));

  const [stats, setStats] = useState<MemberStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [growth, setGrowth] = useState<MemberGrowth | null>(null);
  const [distribution, setDistribution] = useState<ProductDistribution | null>(null);

  const [query, setQuery] = useState("");
  const [product, setProduct] = useState<string | null>("All products");
  const [status, setStatus] = useState<string | null>("All status");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStatsLoading(true);
      void getStats(Number(cardYear), Number(cardMonth))
        .then(setStats)
        .catch(() => setStats(null))
        .finally(() => setStatsLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [cardYear, cardMonth]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void getGrowth(Number(growthYear)).then(setGrowth).catch(() => setGrowth(null));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [growthYear]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void getProductDistribution().then(setDistribution).catch(() => setDistribution(null));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setListLoading(true);
      void listMembers({ page, pageSize: PAGE_SIZE, search: query, product, status })
        .then((result) => { setRows(result.items); setTotal(result.total); })
        .catch(() => { setRows([]); setTotal(0); })
        .finally(() => setListLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [page, query, product, status]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const donutItems = (distribution?.items ?? []).map((item) => ({ key: item.product_id, label: item.name, value: item.count, percentage: item.percentage }));

  return (
    <>
      <PageHeader eyebrow="Community overview" title="Members" description="Pantau komposisi, pertumbuhan, dan aktivitas member lintas produk NAO." />

      <Group justify="flex-end" gap="sm" mb="sm">
        <Select aria-label="Card month" value={cardMonth} onChange={(value) => value && setCardMonth(value)}
          data={MONTH_NAMES.map((name, i) => ({ value: String(i + 1), label: name }))} w={150} />
        <Select aria-label="Card year" value={cardYear} onChange={(value) => value && setCardYear(value)}
          data={yearOptions()} w={110} />
      </Group>

      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} mb="lg">
        {statsLoading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={110} radius="md" />)
        ) : (
          <>
            <MetricCard label="Total members" value={stats.total_members.toLocaleString("id-ID")} icon={IconUsers} />
            <MetricCard label="Active Paid Members" value={stats.active_paid_members.toLocaleString("id-ID")} deltaPct={stats.active_paid_members_delta_pct} icon={IconChartBar} tone="green" />
            <MetricCard label="New this month" value={stats.new_this_month.toLocaleString("id-ID")} deltaPct={stats.new_this_month_delta_pct} icon={IconSparkles} tone="gold" />
            <MetricCard label="Trial conversion" value={`${stats.trial_conversion_pct}%`} deltaPct={stats.trial_conversion_delta_pct} icon={IconTrendingUp} tone="purple" />
          </>
        )}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 3 }} mb="lg" className="analytics-grid">
        <Card className="surface-card chart-card" p="lg" style={{ gridColumn: "span 2" }}>
          <Group justify="space-between" mb="md">
            <Box>
              <Text className="section-title">Member growth</Text>
              <Text size="xs" c="dimmed" mt={3}>Total member per bulan · {growthYear}</Text>
            </Box>
            <Select aria-label="Growth chart year" value={growthYear} onChange={(value) => value && setGrowthYear(value)} data={yearOptions()} w={110} />
          </Group>
          {growth ? (
            <LineChart data={growth.values} labels={growth.labels} formatter={(value) => value.toLocaleString("id-ID")} />
          ) : (
            <Skeleton height={230} radius="md" />
          )}
        </Card>
        <Card className="surface-card" p="lg">
          <Text className="section-title">Product distribution</Text>
          <Text size="xs" c="dimmed" mt={3} mb="xl">Member berdasarkan produk</Text>
          {distribution ? <DistributionDonut items={donutItems} /> : <Skeleton height={190} radius="md" />}
        </Card>
      </SimpleGrid>

      <Card className="surface-card table-card" p={0}>
        <Group className="table-toolbar" justify="space-between" p="lg">
          <Box>
            <Text className="section-title">Latest members</Text>
            <Text size="xs" c="dimmed">{total} records shown</Text>
          </Box>
          <Group gap="sm">
            <TextInput aria-label="Search members" placeholder="Search member..." leftSection={<IconSearch size={16} />}
              value={query} onChange={(event) => { setQuery(event.currentTarget.value); setPage(1); }} w={220} />
            <Select aria-label="Filter product" value={product} onChange={(value) => { setProduct(value); setPage(1); }}
              data={["All products", ...new Set((distribution?.items ?? []).map((item) => item.name))]} w={150} />
            <Select aria-label="Filter status" value={status} onChange={(value) => { setStatus(value); setPage(1); }}
              data={["All status", "Active", "Trial", "Inactive"]} w={130} />
          </Group>
        </Group>
        <ScrollArea>
          <Table miw={820} verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Member</Table.Th>
                <Table.Th>Product</Table.Th>
                <Table.Th>Plan</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Joined</Table.Th>
                <Table.Th>ID</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {listLoading && Array.from({ length: 4 }).map((_, i) => (
                <Table.Tr key={i}><Table.Td colSpan={6}><Skeleton height={20} radius="sm" /></Table.Td></Table.Tr>
              ))}
              {!listLoading && rows.map((member) => (
                <Table.Tr key={member.id} className="clickable-row" tabIndex={0}
                  onClick={() => setSelectedId(member.id)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedId(member.id); }}>
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      <Avatar color="yellow" radius="xl">{member.name.slice(0, 1)}</Avatar>
                      <Box>
                        <Text size="sm" fw={600}>{member.name}</Text>
                        <Text size="xs" c="dimmed">{member.email}</Text>
                      </Box>
                    </Group>
                  </Table.Td>
                  <Table.Td>{member.product ? <Badge variant="outline" color="dark">{member.product}</Badge> : <Text size="xs" c="dimmed">—</Text>}</Table.Td>
                  <Table.Td>{member.plan}</Table.Td>
                  <Table.Td><StatusBadge status={member.status} /></Table.Td>
                  <Table.Td>{formatDate(member.joined)}</Table.Td>
                  <Table.Td><Text size="xs" ff="monospace" c="dimmed">{member.id}</Text></Table.Td>
                </Table.Tr>
              ))}
              {!listLoading && !rows.length && (
                <Table.Tr><Table.Td colSpan={6}><Text size="sm" c="dimmed" ta="center" py="md">No members match these filters.</Text></Table.Td></Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
        <Group className="pagination-bar" justify="space-between" p="md">
          <Text size="xs" c="dimmed">Showing {total ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, total)} of {total}</Text>
          <Pagination value={page} onChange={setPage} total={totalPages} size="sm" />
        </Group>
      </Card>

      <MemberDetailDrawer memberId={selectedId} onClose={() => setSelectedId(null)} />
    </>
  );
}
