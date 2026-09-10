"use client";

import { useState } from "react";
import { Avatar, Badge, Box, Card, Group, Pagination, ScrollArea, Select, SimpleGrid, Table, Text, TextInput } from "@mantine/core";
import { IconChartBar, IconSearch, IconSparkles, IconTrendingUp, IconUsers } from "@tabler/icons-react";
import { DistributionDonut, LineChart } from "@/components/charts";
import { MetricCard, PageHeader, StatusBadge } from "@/components/ui/admin";
import { formatDate } from "@/lib/format";
import type { Member } from "@/types/admin";
import { growthLabels, memberGrowth, members } from "./data";
import { MemberDetailDrawer } from "./components/member-detail-drawer";

export default function MembersPage() {
  const pageSize = 4;
  const [query, setQuery] = useState("");
  const [product, setProduct] = useState<string | null>("All products");
  const [status, setStatus] = useState<string | null>("All status");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Member | null>(null);
  const filtered = members.filter((member) => `${member.name} ${member.email} ${member.id}`.toLowerCase().includes(query.toLowerCase()) && (product === "All products" || member.product === product) && (status === "All status" || member.status === status));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visiblePage = Math.min(page, totalPages);
  const rows = filtered.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);

  return <><PageHeader eyebrow="Community overview" title="Members" description="Pantau komposisi, pertumbuhan, dan aktivitas member lintas produk NAO." /><SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} mb="lg"><MetricCard label="Total members" value="3,248" delta="+12.4%" icon={IconUsers} /><MetricCard label="Active members" value="2,716" delta="+9.8%" icon={IconChartBar} tone="green" /><MetricCard label="New this month" value="234" delta="+18.2%" icon={IconSparkles} tone="gold" /><MetricCard label="Trial conversion" value="34.8%" delta="+3.1%" icon={IconTrendingUp} tone="purple" /></SimpleGrid><SimpleGrid cols={{ base: 1, lg: 3 }} mb="lg" className="analytics-grid"><Card className="surface-card chart-card" p="lg" style={{ gridColumn: "span 2" }}><Group justify="space-between" mb="md"><Box><Text className="section-title">Member growth</Text><Text size="xs" c="dimmed" mt={3}>Total member per bulan · 2026</Text></Box><Badge color="teal" variant="light">+78.5% YTD</Badge></Group><LineChart data={memberGrowth} labels={growthLabels} formatter={(value) => value.toLocaleString("id-ID")} /></Card><Card className="surface-card" p="lg"><Text className="section-title">Product distribution</Text><Text size="xs" c="dimmed" mt={3} mb="xl">Member berdasarkan produk</Text><DistributionDonut /></Card></SimpleGrid><Card className="surface-card table-card" p={0}><Group className="table-toolbar" justify="space-between" p="lg"><Box><Text className="section-title">Latest members</Text><Text size="xs" c="dimmed">{filtered.length} records shown</Text></Box><Group gap="sm"><TextInput aria-label="Search members" placeholder="Search member..." leftSection={<IconSearch size={16} />} value={query} onChange={(event) => { setQuery(event.currentTarget.value); setPage(1); }} w={220} /><Select aria-label="Filter product" value={product} onChange={(value) => { setProduct(value); setPage(1); }} data={["All products", "ThinkNAO", "StudyNAO"]} w={145} /><Select aria-label="Filter status" value={status} onChange={(value) => { setStatus(value); setPage(1); }} data={["All status", "Active", "Trial", "Inactive"]} w={130} /></Group></Group><ScrollArea><Table miw={820} verticalSpacing="md" horizontalSpacing="lg" highlightOnHover><Table.Thead><Table.Tr><Table.Th>Member</Table.Th><Table.Th>Product</Table.Th><Table.Th>Plan</Table.Th><Table.Th>Status</Table.Th><Table.Th>Joined</Table.Th><Table.Th>ID</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{rows.map((member) => <Table.Tr key={member.id} className="clickable-row" tabIndex={0} onClick={() => setSelected(member)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelected(member); }}><Table.Td><Group gap="sm" wrap="nowrap"><Avatar color="yellow" radius="xl">{member.name.slice(0, 1)}</Avatar><Box><Text size="sm" fw={600}>{member.name}</Text><Text size="xs" c="dimmed">{member.email}</Text></Box></Group></Table.Td><Table.Td><Badge variant="outline" color={member.product === "ThinkNAO" ? "dark" : "yellow"}>{member.product}</Badge></Table.Td><Table.Td>{member.plan}</Table.Td><Table.Td><StatusBadge status={member.status} /></Table.Td><Table.Td>{formatDate(member.joined)}</Table.Td><Table.Td><Text size="xs" ff="monospace" c="dimmed">{member.id}</Text></Table.Td></Table.Tr>)}</Table.Tbody></Table></ScrollArea><Group className="pagination-bar" justify="space-between" p="md"><Text size="xs" c="dimmed">Showing {filtered.length ? (visiblePage - 1) * pageSize + 1 : 0}–{Math.min(visiblePage * pageSize, filtered.length)} of {filtered.length}</Text><Pagination value={visiblePage} onChange={setPage} total={totalPages} size="sm" /></Group></Card><MemberDetailDrawer member={selected} onClose={() => setSelected(null)} /></>;
}
