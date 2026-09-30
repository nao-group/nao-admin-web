"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon, Badge, Box, Button, Card, Divider, Drawer, FileInput, Group, Menu, Modal, NumberInput,
  Pagination, ScrollArea, Select, SimpleGrid, Skeleton, Stack, Table, Text, Textarea, TextInput, UnstyledButton,
} from "@mantine/core";
import { DatePickerInput, DateTimePicker } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import {
  IconCheck, IconChevronDown, IconCloudDownload, IconDotsVertical, IconEdit, IconExternalLink, IconPlus,
  IconRefresh, IconUpload,
} from "@tabler/icons-react";
import { DetailItem, MetricCard, PageHeader } from "@/components/ui/admin";
import { formatCurrency, formatDate } from "@/lib/format";
import { primaryRole } from "@/lib/admin-access";
import { useAuthStore } from "@/store/auth";
import { calculateDokuFee } from "../utils";
import {
  adjustIncomeFee, createIncome, getIncomeOverview, incomeExportUrl, incomeInvoiceViewUrl, listDokuFees,
  listIncomes, updateIncome, updateIncomeStatus, uploadIncomeInvoice,
} from "./api";
import type { DokuFeeOption, IncomeOverview, IncomeRow, IncomeSource, IncomeStatus, IncomeWritePayload } from "./types";

const PAGE_SIZE = 20;
const STATUS_OPTIONS: IncomeStatus[] = ["unpaid", "paid", "failed"];
const STATUS_LABELS: Record<IncomeStatus, string> = { unpaid: "Unpaid", paid: "Paid", failed: "Failed" };
const SOURCE_LABELS: Record<IncomeSource, string> = { thinknao: "ThinkNAO", studynao: "StudyNAO", grant: "Hibah", other: "Lainnya" };
const SOURCE_OPTIONS: { value: IncomeSource; label: string }[] = [
  { value: "grant", label: "Hibah" }, { value: "studynao", label: "StudyNAO" },
  { value: "thinknao", label: "ThinkNAO" }, { value: "other", label: "Lainnya" },
];
const SORT_OPTIONS = [
  { value: "date_desc", label: "Tanggal terbaru" }, { value: "date_asc", label: "Tanggal terlama" },
  { value: "amount_desc", label: "Nominal terbesar" }, { value: "amount_asc", label: "Nominal terkecil" },
];

const statusTone = (status: IncomeStatus) => status === "paid" ? "teal" : status === "failed" ? "red" : "yellow";
const sourceLabel = (item: Pick<IncomeRow, "source" | "custom_source">) =>
  item.source === "other" ? item.custom_source?.trim() || "Lainnya" : SOURCE_LABELS[item.source];
const invoiceHref = (item: Pick<IncomeRow, "id" | "invoice_url" | "invoice_file_path">) =>
  item.invoice_file_path ? incomeInvoiceViewUrl(item.id) : item.invoice_url || null;

const generateReference = (prefix: string) => {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
};

const blankForm = (): IncomeWritePayload => ({
  reference: generateReference("INC"),
  source: "studynao", custom_source: "", invoice_url: "",
  occurred_at: new Date().toISOString().slice(0, 16), payer: "", gross_amount: 0,
  payment_method: "Transfer bank", fee_amount: 0, paid_amount: 0, notes: "", status: "unpaid",
});

export default function IncomePage() {
  const session = useAuthStore((state) => state.session);
  const canWrite = session ? primaryRole(session.roles) === "superadmin" : false;

  const [items, setItems] = useState<IncomeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [overview, setOverview] = useState<IncomeOverview | null>(null);
  const [dokuFees, setDokuFees] = useState<DokuFeeOption[]>([]);

  const [page, setPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState<IncomeSource | null>(null);
  const [statusFilter, setStatusFilter] = useState<IncomeStatus | null>(null);
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("date_desc");

  const [editing, setEditing] = useState<IncomeRow | null | undefined>(undefined);
  const [selected, setSelected] = useState<IncomeRow | null>(null);
  const [form, setForm] = useState<IncomeWritePayload>(blankForm());
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [feeAdjustTarget, setFeeAdjustTarget] = useState<IncomeRow | null>(null);
  const [feeAdjustValue, setFeeAdjustValue] = useState(0);

  const filterParams = useMemo(() => ({
    search: query, source: sourceFilter, status: statusFilter,
    date_from: startDate ?? undefined, date_to: endDate ?? undefined,
  }), [query, sourceFilter, statusFilter, startDate, endDate]);

  useEffect(() => {
    void listDokuFees().then(setDokuFees).catch(() => setDokuFees([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setListLoading(true);
      void listIncomes({ page, page_size: PAGE_SIZE, sort: sortBy, ...filterParams })
        .then((result) => { setItems(result.items); setTotal(result.total); })
        .catch(() => { setItems([]); setTotal(0); })
        .finally(() => setListLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [page, sortBy, filterParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void getIncomeOverview(filterParams).then(setOverview).catch(() => setOverview(null));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [filterParams]);

  const refresh = () => {
    void listIncomes({ page, page_size: PAGE_SIZE, sort: sortBy, ...filterParams }).then((result) => { setItems(result.items); setTotal(result.total); });
    void getIncomeOverview(filterParams).then(setOverview);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const open = (item?: IncomeRow) => {
    setForm(item ? {
      reference: item.reference, source: item.source, custom_source: item.custom_source ?? "",
      invoice_url: item.invoice_url ?? "", occurred_at: item.occurred_at.slice(0, 16), payer: item.payer,
      gross_amount: item.gross_amount, payment_method: item.payment_method ?? "", fee_amount: item.fee_amount,
      paid_amount: item.paid_amount, notes: item.notes ?? "", status: item.status,
    } : blankForm());
    setInvoiceFile(null);
    setEditing(item ?? null);
  };
  const update = <K extends keyof IncomeWritePayload>(key: K, value: IncomeWritePayload[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const applyCalculation = (nextAmount = form.gross_amount, nextMethod = form.payment_method ?? "", nextSource = form.source) => {
    const feeConfig = dokuFees.find((item) => item.method_label === nextMethod);
    const fee = nextSource === "thinknao" && feeConfig
      ? calculateDokuFee(nextAmount, { id: feeConfig.id, method: feeConfig.method_label, percentage: feeConfig.percentage, fixedAmount: feeConfig.fixed_amount, note: feeConfig.note ?? "", updatedAt: "" })
      : 0;
    setForm((current) => ({
      ...current, gross_amount: nextAmount, payment_method: nextMethod, source: nextSource,
      fee_amount: fee, paid_amount: current.status === "paid" ? Math.max(0, nextAmount - fee) : current.paid_amount,
    }));
  };

  const submit = async () => {
    if (!form.payer.trim() || !form.reference.trim() || form.gross_amount <= 0 || (form.source === "other" && !form.custom_source?.trim())) {
      notifications.show({ color: "red", message: form.source === "other" && !form.custom_source?.trim() ? "Jenis pemasukan lainnya wajib diisi." : "Referensi, pembayar, dan nominal wajib diisi." });
      return;
    }
    const payload: IncomeWritePayload = {
      ...form, custom_source: form.source === "other" ? form.custom_source?.trim() : "",
      paid_amount: form.status === "paid" ? form.gross_amount - form.fee_amount : form.status === "failed" ? 0 : Math.min(form.paid_amount, form.gross_amount - form.fee_amount),
    };
    try {
      const saved = editing ? await updateIncome(editing.id, payload) : await createIncome(payload);
      if (invoiceFile) await uploadIncomeInvoice(saved.id, invoiceFile);
      setEditing(undefined);
      notifications.show({ color: "teal", message: "Pemasukan berhasil disimpan." });
      refresh();
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "Gagal menyimpan pemasukan." });
    }
  };

  const changeStatus = async (item: IncomeRow, status: IncomeStatus) => {
    try {
      const updated = await updateIncomeStatus(item.id, status);
      setSelected((current) => current?.id === item.id ? updated : current);
      notifications.show({ color: statusTone(status), message: `${item.reference} diubah menjadi ${STATUS_LABELS[status]}.` });
      refresh();
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "Gagal mengubah status." });
    }
  };

  const submitFeeAdjustment = async () => {
    if (!feeAdjustTarget) return;
    try {
      const updated = await adjustIncomeFee(feeAdjustTarget.id, feeAdjustValue);
      setSelected((current) => current?.id === updated.id ? updated : current);
      setFeeAdjustTarget(null);
      notifications.show({ color: "teal", message: `Fee ${updated.reference} disesuaikan.` });
      refresh();
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "Gagal menyesuaikan fee." });
    }
  };

  const statusMenu = (item: IncomeRow) => {
    const badge = <Badge color={statusTone(item.status)} variant="light" leftSection={<span className="status-dot" />} rightSection={canWrite && !item.synced_from_doku ? <IconChevronDown size={12} /> : undefined} className="report-status-badge">{STATUS_LABELS[item.status]}</Badge>;
    if (!canWrite || item.synced_from_doku) return badge;
    return <Menu position="bottom-end" withinPortal>
      <Menu.Target><UnstyledButton className="report-status-trigger" aria-label={`Ubah status ${item.reference}`}>{badge}</UnstyledButton></Menu.Target>
      <Menu.Dropdown>{STATUS_OPTIONS.map((option) => <Menu.Item key={option} disabled={option === item.status} leftSection={<span className="status-option-dot" style={{ background: `var(--mantine-color-${statusTone(option)}-6)` }} />} onClick={() => changeStatus(item, option)}>{STATUS_LABELS[option]}</Menu.Item>)}</Menu.Dropdown>
    </Menu>;
  };

  return <>
    <PageHeader eyebrow="Finance · Pemasukan" title="Pemasukan" description="Kelola hibah, StudyNAO, dan transaksi ThinkNAO yang tersinkron dari DOKU."
      action={<Group>
        <Button variant="light" color="dark" leftSection={<IconCloudDownload size={16} />} onClick={() => window.open(incomeExportUrl(filterParams), "_blank")}>Export CSV</Button>
        {canWrite && <Button className="primary-action" leftSection={<IconPlus size={16} />} onClick={() => open()}>Tambah pemasukan</Button>}
      </Group>} />

    <SimpleGrid cols={{ base: 1, xs: 2, xl: 4 }} mb="lg">
      {!overview ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} height={110} radius="md" />) : <>
        <MetricCard label="Revenue bersih" value={formatCurrency(overview.net_revenue)} delta="status paid" icon={IconCheck} tone="green" />
        <MetricCard label="Gross revenue" value={formatCurrency(overview.gross_revenue)} delta={`${overview.paid_count} transaksi`} icon={IconRefresh} tone="gold" />
        <MetricCard label="DOKU fee" value={formatCurrency(overview.doku_fees)} delta="dipotong otomatis" icon={IconCloudDownload} tone="purple" />
        <MetricCard label="To be paid" value={formatCurrency(overview.to_be_paid)} delta={`${overview.unpaid_count} invoice`} icon={IconExternalLink} />
      </>}
    </SimpleGrid>

    <Card className="surface-card filter-card" p="lg" mb="lg">
      <Group align="flex-end" wrap="wrap">
        <TextInput label="Cari" placeholder="Pembayar atau referensi" value={query} onChange={(event) => { setQuery(event.currentTarget.value); setPage(1); }} flex={1} miw={210} />
        <Select label="Sumber" value={sourceFilter} onChange={(value) => { setSourceFilter(value as IncomeSource | null); setPage(1); }} data={[{ value: "", label: "Semua sumber" }, ...SOURCE_OPTIONS]} clearable w={165} />
        <Select label="Status" value={statusFilter} onChange={(value) => { setStatusFilter(value as IncomeStatus | null); setPage(1); }} data={[{ value: "", label: "Semua status" }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]} clearable w={145} />
        <DatePickerInput type="range" label="Rentang tanggal" placeholder="Pilih tanggal mulai dan akhir" value={[startDate, endDate]} onChange={(value) => { setStartDate(value[0]); setEndDate(value[1]); setPage(1); }} valueFormat="DD MMM YYYY" w={250} />
        <Select label="Urutkan" value={sortBy} onChange={(value) => setSortBy(value ?? "date_desc")} data={SORT_OPTIONS} w={185} />
      </Group>
    </Card>

    <Card className="surface-card table-card" p={0}>
      <Group p="lg" justify="space-between">
        <Box><Text className="section-title">Daftar pemasukan</Text><Text size="xs" c="dimmed">{total} pencatatan · klik baris untuk melihat detail</Text></Box>
        <Badge variant="light" color="teal">Hanya paid masuk revenue</Badge>
      </Group>
      <ScrollArea>
        <Table miw={1120} verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
          <Table.Thead><Table.Tr><Table.Th>Referensi</Table.Th><Table.Th>Sumber</Table.Th><Table.Th>Pembayar</Table.Th><Table.Th>Gross</Table.Th><Table.Th>Fee</Table.Th><Table.Th>Bersih</Table.Th><Table.Th>Paid / To be paid</Table.Th><Table.Th>Status</Table.Th><Table.Th /></Table.Tr></Table.Thead>
          <Table.Tbody>
            {listLoading && Array.from({ length: 5 }).map((_, index) => <Table.Tr key={index}><Table.Td colSpan={9}><Skeleton height={20} radius="sm" /></Table.Td></Table.Tr>)}
            {!listLoading && items.map((item) => {
              const editable = canWrite && !item.synced_from_doku && item.status !== "paid";
              return <Table.Tr key={item.id} className="clickable-row" tabIndex={0} onClick={() => setSelected(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelected(item); }}>
                <Table.Td><Text size="xs" ff="monospace" fw={600}>{item.reference}</Text><Text size="xs" c="dimmed">{formatDate(item.occurred_at)}</Text></Table.Td>
                <Table.Td><Group gap={7}><Badge variant="outline" color={item.source === "thinknao" ? "dark" : item.source === "studynao" ? "yellow" : "teal"}>{sourceLabel(item)}</Badge>{item.synced_from_doku && <Badge size="xs" color="blue" variant="light">DOKU</Badge>}</Group></Table.Td>
                <Table.Td><Text size="sm" fw={600}>{item.payer}</Text><Text size="xs" c="dimmed">{item.payment_method}</Text></Table.Td>
                <Table.Td>{formatCurrency(item.gross_amount)}</Table.Td>
                <Table.Td c={item.fee_amount ? "red.7" : "dimmed"}>-{formatCurrency(item.fee_amount)}</Table.Td>
                <Table.Td fw={700}>{formatCurrency(item.net_amount)}</Table.Td>
                <Table.Td><Text size="sm" fw={600}>{formatCurrency(item.paid_amount)}</Text><Text size="xs" c="dimmed">sisa {formatCurrency(Math.max(0, item.net_amount - item.paid_amount))}</Text></Table.Td>
                <Table.Td onClick={(event) => event.stopPropagation()}>{statusMenu(item)}</Table.Td>
                <Table.Td onClick={(event) => event.stopPropagation()}>
                  {(invoiceHref(item) || editable || (canWrite && item.synced_from_doku)) && <Menu position="bottom-end">
                    <Menu.Target><ActionIcon variant="subtle" color="gray" aria-label={`Aksi ${item.reference}`}><IconDotsVertical size={17} /></ActionIcon></Menu.Target>
                    <Menu.Dropdown>
                      {invoiceHref(item) && <Menu.Item component="a" href={invoiceHref(item)!} target="_blank" rel="noreferrer" leftSection={<IconExternalLink size={15} />}>Lihat invoice</Menu.Item>}
                      {editable && <Menu.Item leftSection={<IconEdit size={15} />} onClick={() => open(item)}>Edit</Menu.Item>}
                      {canWrite && item.synced_from_doku && <Menu.Item leftSection={<IconRefresh size={15} />} onClick={() => { setFeeAdjustValue(item.fee_amount); setFeeAdjustTarget(item); }}>Sesuaikan fee</Menu.Item>}
                    </Menu.Dropdown>
                  </Menu>}
                </Table.Td>
              </Table.Tr>;
            })}
            {!listLoading && !items.length && <Table.Tr><Table.Td colSpan={9}><Text size="sm" c="dimmed" ta="center" py="md">Tidak ada pemasukan yang sesuai filter.</Text></Table.Td></Table.Tr>}
          </Table.Tbody>
        </Table>
      </ScrollArea>
      <Group className="pagination-bar" justify="space-between" p="md">
        <Text size="xs" c="dimmed">Menampilkan {total ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, total)} dari {total}</Text>
        <Pagination value={page} onChange={setPage} total={totalPages} size="sm" />
      </Group>
    </Card>

    <Drawer opened={Boolean(selected)} onClose={() => setSelected(null)} position="right" size="md" title={<Text className="section-title">Detail pemasukan</Text>}>
      {selected && <Stack gap="lg">
        <Card className="detail-hero" p="lg">
          <Group justify="space-between" align="flex-start"><Box><Text ff="monospace" fw={700}>{selected.reference}</Text><Text size="sm" c="dimmed" mt={4}>{formatDate(selected.occurred_at)}</Text></Box>{statusMenu(selected)}</Group>
          <Text className="payment-detail-value">{formatCurrency(selected.net_amount)}</Text>
          <Text size="xs" c="dimmed">pemasukan bersih</Text>
        </Card>
        <SimpleGrid cols={2}>
          <DetailItem label="Jenis pemasukan" value={sourceLabel(selected)} />
          <DetailItem label="Pembayar" value={selected.payer} />
          <DetailItem label="Nominal gross" value={formatCurrency(selected.gross_amount)} />
          <DetailItem label="Payment fee" value={formatCurrency(selected.fee_amount)} />
          <DetailItem label="Sudah dibayar" value={formatCurrency(selected.paid_amount)} />
          <DetailItem label="To be paid" value={formatCurrency(Math.max(0, selected.net_amount - selected.paid_amount))} />
        </SimpleGrid>
        <Divider />
        <Box><Text className="section-title" mb="sm">Catatan</Text><Text size="sm" c="dimmed" lh={1.7}>{selected.notes || "Tidak ada catatan tambahan."}</Text></Box>
        <Group grow>
          {invoiceHref(selected) && <Button component="a" href={invoiceHref(selected)!} target="_blank" rel="noreferrer" variant="light" color="dark" leftSection={<IconExternalLink size={16} />}>Lihat invoice</Button>}
          {canWrite && !selected.synced_from_doku && selected.status !== "paid" && <Button variant="light" color="dark" leftSection={<IconEdit size={16} />} onClick={() => { open(selected); setSelected(null); }}>Edit pemasukan</Button>}
          {canWrite && selected.synced_from_doku && <Button variant="light" color="dark" leftSection={<IconRefresh size={16} />} onClick={() => { setFeeAdjustValue(selected.fee_amount); setFeeAdjustTarget(selected); }}>Sesuaikan fee</Button>}
        </Group>
      </Stack>}
    </Drawer>

    <Modal opened={editing !== undefined} onClose={() => setEditing(undefined)} size="xl" centered title={<Text className="section-title">{editing ? "Edit pemasukan" : "Tambah pemasukan"}</Text>}>
      <Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select label="Jenis pemasukan" required value={form.source} onChange={(value) => applyCalculation(form.gross_amount, value === "thinknao" ? dokuFees[0]?.method_label ?? "" : "Transfer bank", (value ?? "studynao") as IncomeSource)} data={SOURCE_OPTIONS} />
          {form.source === "other" && <TextInput label="Jenis pemasukan lainnya" placeholder="Contoh: Sponsorship" required value={form.custom_source ?? ""} onChange={(event) => update("custom_source", event.currentTarget.value)} />}
          <Select label="Status" required value={form.status} onChange={(value) => { const status = (value ?? "unpaid") as IncomeStatus; setForm((current) => ({ ...current, status, paid_amount: status === "paid" ? current.gross_amount - current.fee_amount : 0 })); }} data={STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABELS[s] }))} />
          <TextInput label="Referensi" required value={form.reference} onChange={(event) => update("reference", event.currentTarget.value)} />
          <DateTimePicker label="Tanggal dan waktu" placeholder="Pilih tanggal dan waktu" required value={form.occurred_at} onChange={(value) => update("occurred_at", value ? value.slice(0, 16) : "")} valueFormat="DD MMMM YYYY, HH:mm" timePickerProps={{ format: "24h" }} />
          <TextInput label="Pembayar" required value={form.payer} onChange={(event) => update("payer", event.currentTarget.value)} />
          <NumberInput label="Nominal gross" required min={0} thousandSeparator="." decimalSeparator="," prefix="Rp " value={form.gross_amount} onChange={(value) => applyCalculation(Number(value) || 0)} />
        </SimpleGrid>
        {form.source === "thinknao" && <Card withBorder radius="md" p="md" className="doku-calculation">
          <Group justify="space-between" align="flex-end">
            <Select label="Metode pembayaran DOKU" value={form.payment_method} onChange={(value) => applyCalculation(form.gross_amount, value ?? dokuFees[0]?.method_label ?? "")} data={dokuFees.filter((f) => f.channel_id !== "UNKNOWN").map((item) => item.method_label)} flex={1} />
            <Badge color="blue" variant="light">Hitung otomatis</Badge>
          </Group>
          <SimpleGrid cols={3} mt="md">
            <Box><Text size="xs" c="dimmed">Gross</Text><Text fw={700}>{formatCurrency(form.gross_amount)}</Text></Box>
            <Box><Text size="xs" c="dimmed">Payment fee</Text><NumberInput variant="unstyled" hideControls value={form.fee_amount} onChange={(value) => setForm((current) => ({ ...current, fee_amount: Number(value) || 0 }))} prefix="Rp " thousandSeparator="." decimalSeparator="," styles={{ input: { fontWeight: 700, color: "#c92a2a" } }} /></Box>
            <Box><Text size="xs" c="dimmed">Pemasukan bersih</Text><Text fw={700} c="teal.8">{formatCurrency(Math.max(0, form.gross_amount - form.fee_amount))}</Text></Box>
          </SimpleGrid>
          <Text size="xs" c="dimmed" mt="sm">Fee dapat diubah pada transaksi ini jika tarif kontrak berbeda. Tarif global tersedia di menu Tarif DOKU.</Text>
        </Card>}
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label="Link invoice (opsional)" placeholder={form.source === "thinknao" ? "https://dashboard.doku.com/invoice/..." : "https://drive.google.com/..."} value={form.invoice_url ?? ""} onChange={(event) => update("invoice_url", event.currentTarget.value)} />
          <FileInput label="Atau upload invoice" placeholder="PDF/JPG/PNG" accept="application/pdf,image/png,image/jpeg" value={invoiceFile} onChange={setInvoiceFile} leftSection={<IconUpload size={16} />} />
        </SimpleGrid>
        {form.status === "unpaid" && <NumberInput label="Sudah dibayar" description={`To be paid: ${formatCurrency(Math.max(0, form.gross_amount - form.fee_amount - form.paid_amount))}`} min={0} max={Math.max(0, form.gross_amount - form.fee_amount)} value={form.paid_amount} onChange={(value) => update("paid_amount", Number(value) || 0)} prefix="Rp " thousandSeparator="." decimalSeparator="," />}
        <Textarea label="Catatan tambahan" minRows={3} value={form.notes ?? ""} onChange={(event) => update("notes", event.currentTarget.value)} />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={() => setEditing(undefined)}>Batal</Button>
          <Button className="primary-action" leftSection={<IconCheck size={16} />} onClick={submit}>Simpan pemasukan</Button>
        </Group>
      </Stack>
    </Modal>

    <Modal opened={Boolean(feeAdjustTarget)} onClose={() => setFeeAdjustTarget(null)} centered title={<Text className="section-title">Sesuaikan fee DOKU</Text>}>
      {feeAdjustTarget && <Stack>
        <Text size="sm" c="dimmed">Koreksi fee untuk transaksi tersinkron <b>{feeAdjustTarget.reference}</b> setelah channel DOKU sebenarnya diketahui.</Text>
        <SimpleGrid cols={2}>
          <DetailItem label="Gross" value={formatCurrency(feeAdjustTarget.gross_amount)} />
          <DetailItem label="Bersih setelah koreksi" value={formatCurrency(Math.max(0, feeAdjustTarget.gross_amount - feeAdjustValue))} />
        </SimpleGrid>
        <NumberInput label="Fee DOKU" min={0} max={feeAdjustTarget.gross_amount} value={feeAdjustValue} onChange={(value) => setFeeAdjustValue(Number(value) || 0)} prefix="Rp " thousandSeparator="." decimalSeparator="," />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={() => setFeeAdjustTarget(null)}>Batal</Button>
          <Button className="primary-action" leftSection={<IconCheck size={16} />} onClick={submitFeeAdjustment}>Simpan fee</Button>
        </Group>
      </Stack>}
    </Modal>
  </>;
}
