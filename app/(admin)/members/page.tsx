"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Avatar, Box, Button, Card, Group, Pagination, ScrollArea, Select, SimpleGrid, Skeleton, Table, Text, TextInput, UnstyledButton } from "@mantine/core";
import { IconChartBar, IconPlus, IconSearch, IconSparkles, IconTrendingUp, IconUsers } from "@tabler/icons-react";
import { DistributionDonut, LineChart } from "@/components/charts";
import { MetricCard, PageHeader, StatusBadge } from "@/components/ui/admin";
import { StudentEntryModal } from "./student-entry/components/student-entry-modal";
import { MemberProducts } from "./components/member-products";
import { PhotoPreviewModal } from "@/components/ui/profile-photo-preview";
import { formatDate } from "@/lib/format";
import { getGrowth, getProductDistribution, getStats, listMembers } from "./api";
import type { MemberGrowth, MemberRow, MemberStats, ProductDistribution } from "./types";

const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const PAGE_SIZE = 10;

function yearOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let year = currentYear + 1; year >= currentYear - 3; year -= 1) years.push(String(year));
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
  const [sortBy, setSortBy] = useState("Terbaru bergabung");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [previewMember, setPreviewMember] = useState<MemberRow | null>(null);
  const [addingStudent, setAddingStudent] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStatsLoading(true);
      void getStats(Number(cardYear), Number(cardMonth)).then(setStats).catch(() => setStats(null)).finally(() => setStatsLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [cardYear, cardMonth]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void getGrowth(Number(growthYear)).then(setGrowth).catch(() => setGrowth(null)); }, 0);
    return () => window.clearTimeout(timer);
  }, [growthYear]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void getProductDistribution().then(setDistribution).catch(() => setDistribution(null)); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setListLoading(true);
      setListError("");
      void listMembers({ page, pageSize: PAGE_SIZE, search: query, product, status, sort: sortBy === "Terlama bergabung" ? "joined_asc" : sortBy === "Nama A–Z" ? "name_asc" : "joined_desc", signal: controller.signal })
        .then((result) => { if (!controller.signal.aborted) { setRows(result.items); setTotal(result.total); if (result.page !== page) setPage(result.page); } })
        .catch((cause) => { if (!controller.signal.aborted) { setRows([]); setTotal(0); setListError(cause instanceof Error ? cause.message : "Daftar member belum dapat dimuat."); } })
        .finally(() => { if (!controller.signal.aborted) setListLoading(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [page, query, product, status, sortBy]);

  const productOptions = [...new Set(["ThinkNao", "StudyNao", ...(distribution?.items ?? []).map((item) => item.name)])];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const donutItems = (distribution?.items ?? []).map((item) => ({ key: item.product_id, label: item.name, value: item.count, percentage: item.percentage }));

  return <>
    <PageHeader eyebrow="Komunitas" title="Member" description="Pantau komposisi, pertumbuhan, dan aktivitas member lintas produk NAO." action={<Button className="primary-action" leftSection={<IconPlus size={16} />} onClick={() => setAddingStudent(true)}>Tambah murid</Button>} />
    <Group justify="flex-end" gap="sm" mb="sm">
      <Select aria-label="Bulan statistik" value={cardMonth} onChange={(value) => value && setCardMonth(value)} data={MONTH_NAMES.map((name, index) => ({ value: String(index + 1), label: name }))} w={150} />
      <Select aria-label="Tahun statistik" value={cardYear} onChange={(value) => value && setCardYear(value)} data={yearOptions()} w={110} />
    </Group>
    <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} mb="lg">
      {statsLoading || !stats ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} height={110} radius="md" />) : <>
        <MetricCard label="Total member" value={stats.total_members.toLocaleString("id-ID")} icon={IconUsers} />
        <MetricCard label="Member paid aktif" value={stats.active_paid_members.toLocaleString("id-ID")} deltaPct={stats.active_paid_members_delta_pct} icon={IconChartBar} tone="green" />
        <MetricCard label="Member baru bulan ini" value={stats.new_this_month.toLocaleString("id-ID")} deltaPct={stats.new_this_month_delta_pct} icon={IconSparkles} tone="gold" />
        <MetricCard label="Konversi trial" value={`${stats.trial_conversion_pct}%`} deltaPct={stats.trial_conversion_delta_pct} icon={IconTrendingUp} tone="purple" />
      </>}
    </SimpleGrid>
    <SimpleGrid cols={{ base: 1, lg: 3 }} mb="lg" className="analytics-grid">
      <Card className="surface-card chart-card" p="lg" style={{ gridColumn: "span 2" }}><Group justify="space-between" mb="md"><Box><Text className="section-title">Pertumbuhan member</Text><Text size="xs" c="dimmed" mt={3}>Total member per bulan · {growthYear}</Text></Box><Select aria-label="Tahun grafik pertumbuhan" value={growthYear} onChange={(value) => value && setGrowthYear(value)} data={yearOptions()} w={110} /></Group>{growth ? <LineChart data={growth.values} labels={growth.labels} formatter={(value) => value.toLocaleString("id-ID")} /> : <Skeleton height={230} radius="md" />}</Card>
      <Card className="surface-card" p="lg"><Text className="section-title">Distribusi produk</Text><Text size="xs" c="dimmed" mt={3} mb="xl">Keikutsertaan produk · satu akun dapat memakai lebih dari satu produk</Text>{distribution ? <DistributionDonut items={donutItems} /> : <Skeleton height={190} radius="md" />}</Card>
    </SimpleGrid>
    <Card className="surface-card table-card" p={0}>
      <Group className="table-toolbar" justify="space-between" p="lg"><Box><Text className="section-title">Member terbaru</Text><Text size="xs" c="dimmed">{total} data ditemukan</Text></Box><Group gap="sm"><TextInput aria-label="Cari member" placeholder="Cari member..." leftSection={<IconSearch size={16} />} value={query} onChange={(event) => { setQuery(event.currentTarget.value); setPage(1); }} w={220} /><Select aria-label="Filter produk" value={product} onChange={(value) => { setProduct(value); setPage(1); }} data={[{ value: "All products", label: "Semua produk" }, ...productOptions.map((name) => ({ value: name, label: name }))]} w={150} /><Select aria-label="Filter status" value={status} onChange={(value) => { setStatus(value); setPage(1); }} data={[{ value: "All status", label: "Semua status" }, "Active", "Trial", "Pending", "Inactive"]} w={145} /><Select aria-label="Urutkan member" value={sortBy} onChange={(value) => { setSortBy(value ?? "Terbaru bergabung"); setPage(1); }} data={["Terbaru bergabung", "Terlama bergabung", "Nama A–Z"]} w={180} /></Group></Group>
      {listError && <Alert color="red" mx="lg" mb="md">{listError}</Alert>}
      <ScrollArea><Table miw={850} verticalSpacing="md" horizontalSpacing="lg" highlightOnHover><Table.Thead><Table.Tr><Table.Th>Member</Table.Th><Table.Th>Produk</Table.Th><Table.Th>Plan</Table.Th><Table.Th>Status</Table.Th><Table.Th>Bergabung</Table.Th><Table.Th>ID</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{listLoading && Array.from({ length: 4 }).map((_, index) => <Table.Tr key={index}><Table.Td colSpan={6}><Skeleton height={20} radius="sm" /></Table.Td></Table.Tr>)}{!listLoading && rows.map((member) => <Table.Tr key={member.id} className="clickable-row" tabIndex={0} onClick={() => router.push(`/members/${encodeURIComponent(member.id)}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); router.push(`/members/${encodeURIComponent(member.id)}`); } }}><Table.Td><Group gap="sm" wrap="nowrap">{member.avatar_url ? <UnstyledButton type="button" className="photo-preview-trigger" aria-label={`Lihat foto ${member.name}`} title={`Lihat foto ${member.name}`} onClick={(event) => { event.stopPropagation(); setPreviewMember(member); }} onKeyDown={(event) => event.stopPropagation()}><Avatar src={member.avatar_url} color="yellow" radius="xl">{member.name.slice(0, 1)}</Avatar></UnstyledButton> : <Avatar color="yellow" radius="xl">{member.name.slice(0, 1)}</Avatar>}<Box><Text size="sm" fw={600}>{member.name}</Text><Text size="xs" c="dimmed">{member.email}</Text></Box></Group></Table.Td><Table.Td><MemberProducts products={member.products} product={member.product} /></Table.Td><Table.Td>{member.plan}</Table.Td><Table.Td><StatusBadge status={member.status} /></Table.Td><Table.Td>{formatDate(member.joined)}</Table.Td><Table.Td><Text size="xs" ff="monospace" c="dimmed">{member.id}</Text></Table.Td></Table.Tr>)}{!listLoading && !listError && !rows.length && <Table.Tr><Table.Td colSpan={6}><Text size="sm" c="dimmed" ta="center" py="md">Tidak ada member yang sesuai filter.</Text></Table.Td></Table.Tr>}</Table.Tbody></Table></ScrollArea>
      <Group className="pagination-bar" justify="space-between" p="md"><Text size="xs" c="dimmed">Menampilkan {total ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, total)} dari {total}</Text><Pagination value={page} onChange={setPage} total={totalPages} size="sm" /></Group>
    </Card>
    <StudentEntryModal opened={addingStudent} onClose={() => setAddingStudent(false)} />
    <PhotoPreviewModal src={previewMember?.avatar_url} name={previewMember?.name ?? "member"} opened={Boolean(previewMember)} onClose={() => setPreviewMember(null)} />
  </>;
}
