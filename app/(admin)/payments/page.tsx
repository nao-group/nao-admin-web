"use client";

import { useState } from "react";
import { Badge, Box, Button, Card, Group, Pagination, ScrollArea, Select, SimpleGrid, Table, Text, TextInput } from "@mantine/core";
import { IconChartBar, IconCheck, IconCreditCard, IconTrendingUp } from "@tabler/icons-react";
import { LineChart } from "@/components/charts";
import { MetricCard, PageHeader, StatusBadge } from "@/components/ui/admin";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Payment } from "@/types/admin";
import { payments, revenueGrowth, revenueLabels } from "./data";
import { PaymentDetailDrawer } from "./components/payment-detail-drawer";

export default function PaymentsPage() {
  const pageSize = 4;
  const [status, setStatus] = useState<string | null>("All status");
  const [start, setStart] = useState("2026-09-01");
  const [end, setEnd] = useState("2026-09-30");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Payment | null>(null);
  const filtered = payments.filter((payment) => (status === "All status" || payment.status === status) && payment.date >= start && payment.date <= end);
  const total = filtered.filter((payment) => payment.status === "Paid").reduce((sum, payment) => sum + payment.amount, 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visiblePage = Math.min(page, totalPages);
  const rows = filtered.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);

  return <><PageHeader eyebrow="Finance" title="Payment records" description="Rekonsiliasi transaksi dan pantau pertumbuhan pendapatan NAO Group." action={<Button variant="light" color="dark" leftSection={<IconCreditCard size={17} />}>Export report</Button>} /><Card className="surface-card filter-card" p="lg" mb="lg"><Group justify="space-between" align="flex-end"><Group align="flex-end"><Select label="Payment status" value={status} onChange={(value) => { setStatus(value); setPage(1); }} data={["All status", "Paid", "Pending", "Failed", "Refunded"]} w={160} /><TextInput label="Date start" type="date" value={start} onChange={(event) => { setStart(event.currentTarget.value); setPage(1); }} /><TextInput label="Date end" type="date" value={end} onChange={(event) => { setEnd(event.currentTarget.value); setPage(1); }} /></Group><Button variant="subtle" color="dark" onClick={() => { setStatus("All status"); setStart("2026-09-01"); setEnd("2026-09-30"); setPage(1); }}>Reset filters</Button></Group></Card><SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} mb="lg"><MetricCard label="Revenue (filtered)" value={formatCurrency(total)} delta="+11.6%" icon={IconTrendingUp} tone="gold" /><MetricCard label="Successful payments" value={String(filtered.filter((item) => item.status === "Paid").length)} delta="+8.2%" icon={IconCheck} tone="green" /><MetricCard label="Pending payments" value={String(filtered.filter((item) => item.status === "Pending").length)} delta="+1.4%" icon={IconCreditCard} /><MetricCard label="Success rate" value="94.2%" delta="+2.3%" icon={IconChartBar} tone="purple" /></SimpleGrid><Card className="surface-card chart-card" p="lg" mb="lg"><Group justify="space-between" mb="md"><Box><Text className="section-title">Revenue growth</Text><Text size="xs" c="dimmed">Monthly revenue in million IDR</Text></Box><Text fw={700} c="teal.8">Rp 43.7M</Text></Group><LineChart data={revenueGrowth} labels={revenueLabels} color="#0f766e" fill="#d6f5ed" formatter={(value) => `Rp ${value}M`} /></Card><Card className="surface-card table-card" p={0}><Group p="lg"><Box><Text className="section-title">Transactions</Text><Text size="xs" c="dimmed">{filtered.length} payment records</Text></Box></Group><ScrollArea><Table miw={850} verticalSpacing="md" horizontalSpacing="lg" highlightOnHover><Table.Thead><Table.Tr><Table.Th>Invoice</Table.Th><Table.Th>Member</Table.Th><Table.Th>Product</Table.Th><Table.Th>Date</Table.Th><Table.Th>Method</Table.Th><Table.Th>Status</Table.Th><Table.Th ta="right">Amount</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{rows.map((payment) => <Table.Tr key={payment.id} className="clickable-row" tabIndex={0} onClick={() => setSelected(payment)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelected(payment); }}><Table.Td><Text ff="monospace" size="xs" fw={600}>{payment.id}</Text></Table.Td><Table.Td><Text size="sm" fw={600}>{payment.member}</Text></Table.Td><Table.Td><Badge variant="outline" color={payment.product === "ThinkNAO" ? "dark" : "yellow"}>{payment.product}</Badge></Table.Td><Table.Td>{formatDate(payment.date)}</Table.Td><Table.Td>{payment.method}</Table.Td><Table.Td><StatusBadge status={payment.status} /></Table.Td><Table.Td ta="right"><Text fw={700}>{formatCurrency(payment.amount)}</Text></Table.Td></Table.Tr>)}</Table.Tbody></Table></ScrollArea><Group className="pagination-bar" justify="space-between" p="md"><Text size="xs" c="dimmed">Showing {filtered.length ? (visiblePage - 1) * pageSize + 1 : 0}–{Math.min(visiblePage * pageSize, filtered.length)} of {filtered.length}</Text><Pagination value={visiblePage} onChange={setPage} total={totalPages} size="sm" /></Group></Card><PaymentDetailDrawer payment={selected} onClose={() => setSelected(null)} /></>;
}
