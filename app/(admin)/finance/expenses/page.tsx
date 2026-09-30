"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon, Badge, Box, Button, Card, Divider, Drawer, FileInput, Group, Menu, Modal, NumberInput,
  Pagination, ScrollArea, Select, SimpleGrid, Skeleton, Stack, Table, Text, Textarea, TextInput, UnstyledButton,
} from "@mantine/core";
import { DatePickerInput, DateTimePicker } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import {
  IconBuildingBank, IconCheck, IconChevronDown, IconDotsVertical, IconDownload, IconEdit, IconExternalLink,
  IconPlus, IconUpload, IconWallet,
} from "@tabler/icons-react";
import { DetailItem, MetricCard, PageHeader } from "@/components/ui/admin";
import { formatCurrency, formatDate } from "@/lib/format";
import { primaryRole } from "@/lib/admin-access";
import { useAuthStore } from "@/store/auth";
import {
  createExpense, expenseEvidenceViewUrl, expenseExportUrl, getExpenseOverview, listExpenses, updateExpense,
  updateExpenseStatus, uploadExpenseEvidence,
} from "./api";
import type { ExpenseCategory, ExpenseOverview, ExpenseRow, ExpenseStatus, ExpenseWritePayload } from "./types";

const PAGE_SIZE = 20;
const STATUS_OPTIONS: ExpenseStatus[] = ["pending", "done"];
const STATUS_LABELS: Record<ExpenseStatus, string> = { pending: "Pending", done: "Done" };
const CATEGORY_LABELS: Record<ExpenseCategory, string> = { payroll: "Gaji", bank_fee: "Biaya admin bank", maintenance: "Maintenance", other: "Lainnya" };
const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: "payroll", label: "Gaji" }, { value: "bank_fee", label: "Biaya admin bank" },
  { value: "maintenance", label: "Maintenance" }, { value: "other", label: "Lainnya" },
];
const SORT_OPTIONS = [
  { value: "date_desc", label: "Tanggal terbaru" }, { value: "date_asc", label: "Tanggal terlama" },
  { value: "amount_desc", label: "Nominal terbesar" }, { value: "amount_asc", label: "Nominal terkecil" },
];

const categoryLabel = (item: Pick<ExpenseRow, "category" | "custom_category">) =>
  item.category === "other" ? item.custom_category?.trim() || "Lainnya" : CATEGORY_LABELS[item.category];
const evidenceHref = (item: Pick<ExpenseRow, "id" | "evidence_url" | "evidence_file_path">) =>
  item.evidence_file_path ? expenseEvidenceViewUrl(item.id) : item.evidence_url || null;

const generateReference = (prefix: string) => {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
};

const blankForm = (): ExpenseWritePayload => ({
  reference: generateReference("EXP"),
  category: "maintenance", custom_category: "", occurred_at: new Date().toISOString().slice(0, 16),
  paid_by: "", evidence_url: "", amount: 0, notes: "", status: "pending",
});

export default function ExpensesPage() {
  const session = useAuthStore((state) => state.session);
  const canWrite = session ? primaryRole(session.roles) === "superadmin" : false;

  const [items, setItems] = useState<ExpenseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [overview, setOverview] = useState<ExpenseOverview | null>(null);

  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [status, setStatus] = useState<ExpenseStatus | null>(null);
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("date_desc");

  const [editing, setEditing] = useState<ExpenseRow | null | undefined>(undefined);
  const [selected, setSelected] = useState<ExpenseRow | null>(null);
  const [form, setForm] = useState<ExpenseWritePayload>(blankForm());
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  const filterParams = useMemo(() => ({
    search: query, category, status, date_from: startDate ?? undefined, date_to: endDate ?? undefined,
  }), [query, category, status, startDate, endDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setListLoading(true);
      void listExpenses({ page, page_size: PAGE_SIZE, sort: sortBy, ...filterParams })
        .then((result) => { setItems(result.items); setTotal(result.total); })
        .catch(() => { setItems([]); setTotal(0); })
        .finally(() => setListLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [page, sortBy, filterParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void getExpenseOverview(filterParams).then(setOverview).catch(() => setOverview(null));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [filterParams]);

  const refresh = () => {
    void listExpenses({ page, page_size: PAGE_SIZE, sort: sortBy, ...filterParams }).then((result) => { setItems(result.items); setTotal(result.total); });
    void getExpenseOverview(filterParams).then(setOverview);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const open = (item?: ExpenseRow) => {
    setForm(item ? {
      reference: item.reference, category: item.category, custom_category: item.custom_category ?? "",
      occurred_at: item.occurred_at.slice(0, 16), paid_by: item.paid_by, evidence_url: item.evidence_url ?? "",
      amount: item.amount, notes: item.notes ?? "", status: item.status,
    } : blankForm());
    setEvidenceFile(null);
    setEditing(item ?? null);
  };
  const update = <K extends keyof ExpenseWritePayload>(key: K, value: ExpenseWritePayload[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (!form.reference.trim() || !form.paid_by.trim() || form.amount <= 0 || (form.category === "other" && !form.custom_category?.trim())) {
      notifications.show({ color: "red", message: form.category === "other" && !form.custom_category?.trim() ? "Jenis pengeluaran lainnya wajib diisi." : "Referensi, sumber dana, dan nominal wajib diisi." });
      return;
    }
    const payload: ExpenseWritePayload = {
      ...form, custom_category: form.category === "other" ? form.custom_category?.trim() : "",
    };
    try {
      const saved = editing ? await updateExpense(editing.id, payload) : await createExpense(payload);
      if (evidenceFile) await uploadExpenseEvidence(saved.id, evidenceFile);
      setEditing(undefined);
      notifications.show({ color: "teal", message: "Pengeluaran berhasil disimpan." });
      refresh();
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "Gagal menyimpan pengeluaran." });
    }
  };

  const changeStatus = async (item: ExpenseRow, next: ExpenseStatus) => {
    try {
      const updated = await updateExpenseStatus(item.id, next);
      setSelected((current) => current?.id === item.id ? updated : current);
      notifications.show({ color: next === "done" ? "teal" : "yellow", message: `${item.reference} diubah menjadi ${STATUS_LABELS[next]}.` });
      refresh();
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "Gagal mengubah status." });
    }
  };

  const statusMenu = (item: ExpenseRow) => {
    const badge = <Badge color={item.status === "done" ? "teal" : "yellow"} variant="light" leftSection={<span className="status-dot" />} rightSection={canWrite ? <IconChevronDown size={12} /> : undefined} className="report-status-badge">{STATUS_LABELS[item.status]}</Badge>;
    if (!canWrite) return badge;
    return <Menu position="bottom-end" withinPortal>
      <Menu.Target><UnstyledButton className="report-status-trigger" aria-label={`Ubah status ${item.reference}`}>{badge}</UnstyledButton></Menu.Target>
      <Menu.Dropdown>{STATUS_OPTIONS.map((option) => <Menu.Item key={option} disabled={option === item.status} leftSection={<span className="status-option-dot" style={{ background: `var(--mantine-color-${option === "done" ? "teal" : "yellow"}-6)` }} />} onClick={() => changeStatus(item, option)}>{STATUS_LABELS[option]}</Menu.Item>)}</Menu.Dropdown>
    </Menu>;
  };

  return <>
    <PageHeader eyebrow="Finance · Pengeluaran" title="Pengeluaran" description="Catat biaya operasional, reimbursement, maintenance, dan pengeluaran payroll."
      action={<Group>
        <Button variant="light" color="dark" leftSection={<IconDownload size={16} />} onClick={() => window.open(expenseExportUrl(filterParams), "_blank")}>Export CSV</Button>
        {canWrite && <Button className="primary-action" leftSection={<IconPlus size={17} />} onClick={() => open()}>Tambah pengeluaran</Button>}
      </Group>} />

    <SimpleGrid cols={{ base: 1, xs: 2, xl: 4 }} mb="lg">
      {!overview ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} height={110} radius="md" />) : <>
        <MetricCard label="Pengeluaran done" value={formatCurrency(overview.paid_total)} icon={IconCheck} tone="green" />
        <MetricCard label="Menunggu pembayaran" value={formatCurrency(overview.pending_total)} icon={IconWallet} tone="gold" />
        <MetricCard label="Aturan otomatis" value={String(overview.active_automation_count)} delta="aktif setiap bulan" icon={IconBuildingBank} tone="purple" />
      </>}
    </SimpleGrid>

    <Card className="surface-card filter-card" p="lg" mb="lg">
      <Group align="flex-end" wrap="wrap">
        <TextInput label="Cari" placeholder="Sumber dana atau referensi" value={query} onChange={(event) => { setQuery(event.currentTarget.value); setPage(1); }} flex={1} miw={210} />
        <Select label="Jenis pengeluaran" value={category} onChange={(value) => { setCategory(value as ExpenseCategory | null); setPage(1); }} data={[{ value: "", label: "Semua jenis" }, ...CATEGORY_OPTIONS]} clearable w={210} />
        <Select label="Status" value={status} onChange={(value) => { setStatus(value as ExpenseStatus | null); setPage(1); }} data={[{ value: "", label: "Semua status" }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]} clearable w={150} />
        <DatePickerInput type="range" label="Rentang tanggal" placeholder="Pilih tanggal mulai dan akhir" value={[startDate, endDate]} onChange={(value) => { setStartDate(value[0]); setEndDate(value[1]); setPage(1); }} valueFormat="DD MMM YYYY" w={250} />
        <Select label="Urutkan" value={sortBy} onChange={(value) => setSortBy(value ?? "date_desc")} data={SORT_OPTIONS} w={190} />
      </Group>
    </Card>

    <Card className="surface-card table-card" p={0}>
      <Group p="lg" justify="space-between"><Box><Text className="section-title">Daftar pengeluaran</Text><Text size="xs" c="dimmed">{total} pencatatan · klik baris untuk melihat detail</Text></Box></Group>
      <ScrollArea>
        <Table miw={980} verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
          <Table.Thead><Table.Tr><Table.Th>Referensi</Table.Th><Table.Th>Jenis</Table.Th><Table.Th>Sumber dana</Table.Th><Table.Th>Catatan</Table.Th><Table.Th>Status</Table.Th><Table.Th ta="right">Nominal</Table.Th><Table.Th /></Table.Tr></Table.Thead>
          <Table.Tbody>
            {listLoading && Array.from({ length: 5 }).map((_, index) => <Table.Tr key={index}><Table.Td colSpan={7}><Skeleton height={20} radius="sm" /></Table.Td></Table.Tr>)}
            {!listLoading && items.map((item) => {
              const editable = canWrite && item.status === "pending";
              return <Table.Tr key={item.id} className="clickable-row" tabIndex={0} onClick={() => setSelected(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelected(item); }}>
                <Table.Td><Text size="xs" ff="monospace" fw={600}>{item.reference}</Text><Text size="xs" c="dimmed">{formatDate(item.occurred_at)}</Text></Table.Td>
                <Table.Td><Group gap={6}><Badge variant="outline" color={item.category === "payroll" ? "dark" : item.category === "maintenance" ? "violet" : "yellow"}>{categoryLabel(item)}</Badge>{item.recurring && <Badge size="xs" color="teal" variant="light">Auto</Badge>}</Group></Table.Td>
                <Table.Td><Text size="sm" fw={600}>{item.paid_by}</Text></Table.Td>
                <Table.Td><Text size="xs" c="dimmed" maw={280} lineClamp={2}>{item.notes}</Text></Table.Td>
                <Table.Td onClick={(event) => event.stopPropagation()}>{statusMenu(item)}</Table.Td>
                <Table.Td ta="right" fw={700}>{formatCurrency(item.amount)}</Table.Td>
                <Table.Td onClick={(event) => event.stopPropagation()}>
                  {(evidenceHref(item) || editable) && <Menu position="bottom-end">
                    <Menu.Target><ActionIcon variant="subtle" color="gray" aria-label={`Aksi ${item.reference}`}><IconDotsVertical size={17} /></ActionIcon></Menu.Target>
                    <Menu.Dropdown>
                      {evidenceHref(item) && <Menu.Item component="a" href={evidenceHref(item)!} target="_blank" rel="noreferrer" leftSection={<IconExternalLink size={15} />}>Lihat bukti transaksi</Menu.Item>}
                      {editable && <Menu.Item leftSection={<IconEdit size={15} />} onClick={() => open(item)}>Edit</Menu.Item>}
                    </Menu.Dropdown>
                  </Menu>}
                </Table.Td>
              </Table.Tr>;
            })}
            {!listLoading && !items.length && <Table.Tr><Table.Td colSpan={7}><Text size="sm" c="dimmed" ta="center" py="md">Tidak ada pengeluaran yang sesuai filter.</Text></Table.Td></Table.Tr>}
          </Table.Tbody>
        </Table>
      </ScrollArea>
      <Group className="pagination-bar" justify="space-between" p="md">
        <Text size="xs" c="dimmed">Menampilkan {total ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, total)} dari {total}</Text>
        <Pagination value={page} onChange={setPage} total={totalPages} size="sm" />
      </Group>
    </Card>

    <Drawer opened={Boolean(selected)} onClose={() => setSelected(null)} position="right" size="md" title={<Text className="section-title">Detail pengeluaran</Text>}>
      {selected && <Stack gap="lg">
        <Card className="detail-hero" p="lg">
          <Group justify="space-between" align="flex-start"><Box><Text ff="monospace" fw={700}>{selected.reference}</Text><Text size="sm" c="dimmed" mt={4}>{formatDate(selected.occurred_at)}</Text></Box>{statusMenu(selected)}</Group>
          <Text className="payment-detail-value">{formatCurrency(selected.amount)}</Text>
        </Card>
        <SimpleGrid cols={2}>
          <DetailItem label="Jenis" value={categoryLabel(selected)} />
          <DetailItem label="Sumber dana" value={selected.paid_by} />
          <DetailItem label="Dibuat otomatis" value={selected.recurring ? "Ya" : "Tidak"} />
          <DetailItem label="Bukti transaksi" value={evidenceHref(selected) ? <a href={evidenceHref(selected)!} target="_blank" rel="noreferrer">Lihat bukti transaksi</a> : "Belum ada"} />
        </SimpleGrid>
        <Divider />
        <Box><Text className="section-title" mb="sm">Catatan</Text><Text size="sm" c="dimmed" lh={1.7}>{selected.notes || "Tidak ada catatan tambahan."}</Text></Box>
        {canWrite && selected.status === "pending" && <Button variant="light" color="dark" leftSection={<IconEdit size={16} />} onClick={() => { open(selected); setSelected(null); }}>Edit pengeluaran</Button>}
      </Stack>}
    </Drawer>

    <Modal opened={editing !== undefined} onClose={() => setEditing(undefined)} size="lg" centered title={<Text className="section-title">{editing ? "Edit pengeluaran" : "Tambah pengeluaran"}</Text>}>
      <Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select label="Jenis pengeluaran" required value={form.category} onChange={(value) => update("category", (value ?? "other") as ExpenseCategory)} data={CATEGORY_OPTIONS} />
          {form.category === "other" && <TextInput label="Jenis pengeluaran lainnya" placeholder="Contoh: Transportasi" required value={form.custom_category ?? ""} onChange={(event) => update("custom_category", event.currentTarget.value)} />}
          <Select label="Status" required value={form.status} onChange={(value) => update("status", (value ?? "pending") as ExpenseStatus)} data={STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABELS[s] }))} />
          <TextInput label="Referensi" required value={form.reference} onChange={(event) => update("reference", event.currentTarget.value)} />
          <DateTimePicker label="Tanggal dan waktu" placeholder="Pilih tanggal dan waktu" required value={form.occurred_at} onChange={(value) => update("occurred_at", value ? value.slice(0, 16) : "")} valueFormat="DD MMMM YYYY, HH:mm" timePickerProps={{ format: "24h" }} />
          <TextInput label="Sumber dana" required value={form.paid_by} onChange={(event) => update("paid_by", event.currentTarget.value)} />
          <NumberInput label="Nominal" required min={0} value={form.amount} onChange={(value) => update("amount", Number(value) || 0)} prefix="Rp " thousandSeparator="." decimalSeparator="," />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label="Link bukti transaksi" placeholder="https://drive.google.com/..." value={form.evidence_url ?? ""} onChange={(event) => update("evidence_url", event.currentTarget.value)} />
          <FileInput label="Atau upload bukti" placeholder="PDF/JPG/PNG" accept="application/pdf,image/png,image/jpeg" value={evidenceFile} onChange={setEvidenceFile} leftSection={<IconUpload size={16} />} />
        </SimpleGrid>
        <Textarea label="Catatan" minRows={3} value={form.notes ?? ""} onChange={(event) => update("notes", event.currentTarget.value)} />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={() => setEditing(undefined)}>Batal</Button>
          <Button className="primary-action" leftSection={<IconCheck size={16} />} onClick={submit}>Simpan pengeluaran</Button>
        </Group>
      </Stack>
    </Modal>
  </>;
}
