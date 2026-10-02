"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon, Badge, Box, Button, Card, Group, Menu, Modal, NumberInput, ScrollArea, Select, SimpleGrid,
  Skeleton, Stack, Table, Text, Textarea, TextInput, UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCalendarPlus, IconCheck, IconChevronDown, IconClockDollar, IconDotsVertical, IconEdit, IconMailForward,
  IconPlus, IconReceipt2, IconRefresh, IconWallet,
} from "@tabler/icons-react";
import { MetricCard, PageHeader } from "@/components/ui/admin";
import { formatCurrency, formatDate } from "@/lib/format";
import { primaryRole } from "@/lib/admin-access";
import { useAuthStore } from "@/store/auth";
import {
  createPayroll, generatePayrolls, getPayrollOverview, getPayrollSettings, listPayroll, listPayrollReimbursements, listStaffOptions,
  payslipViewUrl, recalculatePayroll, resendPayslip, updatePayroll, updatePayrollStatus,
} from "./api";
import type { PayrollOverview, PayrollReimbursement, PayrollRow, PayrollStatus, PayrollWritePayload, StaffOption } from "./types";

const PAGE_SIZE = 50;
const STATUS_OPTIONS: PayrollStatus[] = ["pending", "done"];
const STATUS_LABELS: Record<PayrollStatus, string> = { pending: "Pending", done: "Done" };

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const EXPENSE_CATEGORY_LABELS: Record<string, string> = { bank_fee: "Biaya admin bank", maintenance: "Maintenance", reimbursement: "Reimbursement", other: "Lainnya" };

const currentPeriod = () => new Date().toISOString().slice(0, 7);
// Monthly drafts cover the month that just ended — same default as the backend job.
const previousPeriod = () => {
  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();
  return `${year}-${String(month).padStart(2, "0")}`;
};
const periodLabel = (period: string) => {
  const [year, month] = period.split("-");
  return `${MONTHS[Number(month) - 1] ?? month} ${year}`;
};

const blankForm = (): PayrollWritePayload => ({
  staff_id: 0, period: currentPeriod(), base_salary: 0, allowance: 0, notes: "",
});
const isBca = (bankName: string | null | undefined) => (bankName ?? "").trim().toUpperCase() === "BCA";

export default function PayrollPage() {
  const session = useAuthStore((state) => state.session);
  const canWrite = session ? primaryRole(session.roles) === "superadmin" : false;

  const [items, setItems] = useState<PayrollRow[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [overview, setOverview] = useState<PayrollOverview | null>(null);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [nonBcaFee, setNonBcaFee] = useState<number | null>(null);

  const [periodFilter, setPeriodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<PayrollStatus | null>(null);
  const [query, setQuery] = useState("");

  const [editing, setEditing] = useState<PayrollRow | null | undefined>(undefined);
  const [form, setForm] = useState<PayrollWritePayload>(blankForm());
  const [generating, setGenerating] = useState(false);
  const [reimbursementTarget, setReimbursementTarget] = useState<PayrollRow | null>(null);
  const [reimbursements, setReimbursements] = useState<PayrollReimbursement[] | null>(null);

  const filterParams = useMemo(() => ({
    page: 1, page_size: PAGE_SIZE, period: periodFilter || undefined, status: statusFilter, search: query,
  }), [periodFilter, statusFilter, query]);

  const refresh = () => {
    setListLoading(true);
    void listPayroll(filterParams).then((r) => { setItems(r.items); setTotal(r.total); }).catch(() => { setItems([]); setTotal(0); }).finally(() => setListLoading(false));
    void getPayrollOverview().then(setOverview).catch(() => setOverview(null));
  };

  useEffect(() => {
    const timer = window.setTimeout(refresh, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterParams]);

  useEffect(() => {
    void listStaffOptions().then(setStaffOptions).catch(() => setStaffOptions([]));
    void getPayrollSettings().then((settings) => setNonBcaFee(settings.non_bca_transfer_fee)).catch(() => setNonBcaFee(null));
  }, []);

  const open = (item?: PayrollRow) => {
    setForm(item ? {
      staff_id: item.staff_id, period: item.period, base_salary: item.base_salary, allowance: item.allowance,
      notes: item.notes ?? "",
    } : blankForm());
    setEditing(item ?? null);
  };
  const update = <K extends keyof PayrollWritePayload>(key: K, value: PayrollWritePayload[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const pickStaff = (staffId: number) => {
    const staff = staffOptions.find((s) => s.id === staffId);
    setForm((current) => ({
      ...current, staff_id: staffId,
      base_salary: staff ? staff.base_salary : current.base_salary,
      allowance: staff ? staff.allowance : current.allowance,
    }));
  };

  // The saved reimbursement is only an estimate here: the backend re-derives it on save
  // (changing staff or period changes which expenses belong to this payroll).
  const formReimbursement = editing && editing.staff_id === form.staff_id && editing.period === form.period ? editing.reimbursement : 0;
  // Mirrors the backend (services/admin/payroll.py::transfer_fee_for), which sets the fee on save.
  const selectedBank = staffOptions.find((option) => option.id === form.staff_id)?.bank_name
    ?? (editing && editing.staff_id === form.staff_id ? editing.staff.bank_name : null);
  const formAdminFee = !form.staff_id || isBca(selectedBank) ? 0 : nonBcaFee ?? editing?.admin_fee ?? 0;
  const totalTransfer = Math.max(0, form.base_salary + form.allowance + formReimbursement - formAdminFee);

  const submit = async () => {
    if (!form.staff_id || !form.period || form.base_salary <= 0) {
      notifications.show({ color: "red", message: "Staff, periode, dan gaji pokok wajib diisi." });
      return;
    }
    try {
      if (editing) await updatePayroll(editing.id, form); else await createPayroll(form);
      setEditing(undefined);
      notifications.show({ color: "teal", message: "Payroll berhasil disimpan." });
      refresh();
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "Gagal menyimpan payroll." });
    }
  };

  const changeStatus = async (item: PayrollRow, status: PayrollStatus) => {
    try {
      await updatePayrollStatus(item.id, status);
      notifications.show({
        color: status === "done" ? "teal" : "yellow",
        message: status === "done" ? `${item.staff.full_name} ditandai Done — slip gaji sedang dikirim via email.` : `${item.staff.full_name} diubah menjadi Pending.`,
      });
      refresh();
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "Gagal mengubah status." });
    }
  };

  const generateDrafts = async () => {
    const period = previousPeriod();
    if (!window.confirm(`Buat draft payroll ${periodLabel(period)} untuk semua staff aktif yang belum punya payroll periode ini?`)) return;
    setGenerating(true);
    try {
      const { created } = await generatePayrolls(period);
      notifications.show({ color: "teal", message: created ? `${created} draft payroll ${periodLabel(period)} dibuat.` : `Semua staff aktif sudah punya payroll ${periodLabel(period)}.` });
      refresh();
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "Gagal membuat draft payroll." });
    } finally {
      setGenerating(false);
    }
  };

  const recalculate = async (item: PayrollRow) => {
    try {
      const updated = await recalculatePayroll(item.id);
      notifications.show({ color: "teal", message: `Reimbursement ${item.staff.full_name} dihitung ulang: ${formatCurrency(updated.reimbursement)}.` });
      refresh();
      if (reimbursementTarget?.id === item.id) showReimbursements(updated);
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "Gagal menghitung ulang reimbursement." });
    }
  };

  const showReimbursements = (item: PayrollRow) => {
    setReimbursementTarget(item);
    setReimbursements(null);
    void listPayrollReimbursements(item.id).then(setReimbursements).catch(() => setReimbursements([]));
  };

  const resend = async (item: PayrollRow) => {
    try {
      await resendPayslip(item.id);
      notifications.show({ color: "teal", message: `Slip gaji ${item.staff.full_name} dikirim ulang ke ${item.staff.email ?? "email terdaftar"}.` });
      refresh();
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "Gagal mengirim ulang slip gaji." });
    }
  };

  const statusMenu = (item: PayrollRow) => {
    const badge = <Badge color={item.status === "done" ? "teal" : "yellow"} variant="light" leftSection={<span className="status-dot" />} rightSection={canWrite ? <IconChevronDown size={12} /> : undefined} className="report-status-badge">{STATUS_LABELS[item.status]}</Badge>;
    if (!canWrite) return badge;
    return <Menu position="bottom-end" withinPortal>
      <Menu.Target><UnstyledButton className="report-status-trigger" aria-label={`Ubah status ${item.staff.full_name}`}>{badge}</UnstyledButton></Menu.Target>
      <Menu.Dropdown>{STATUS_OPTIONS.map((option) => <Menu.Item key={option} disabled={option === item.status} leftSection={<span className="status-option-dot" style={{ background: `var(--mantine-color-${option === "done" ? "teal" : "yellow"}-6)` }} />} onClick={() => changeStatus(item, option)}>{STATUS_LABELS[option]}</Menu.Item>)}</Menu.Dropdown>
    </Menu>;
  };

  return <>
    <PageHeader eyebrow="Finance · Payroll" title="Payroll & Slip Gaji" description="Kelola gaji, reimbursement, dan biaya admin transfer karyawan setiap periode."
      action={canWrite && <Group>
        <Button variant="light" color="dark" loading={generating} leftSection={<IconCalendarPlus size={16} />} onClick={generateDrafts}>Buat draft {periodLabel(previousPeriod())}</Button>
        <Button className="primary-action" leftSection={<IconPlus size={16} />} onClick={() => open()}>Tambah payroll</Button>
      </Group>} />

    <SimpleGrid cols={{ base: 1, xs: 2, xl: 4 }} mb="lg">
      {!overview ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} height={110} radius="md" />) : <>
        <MetricCard label="Total payroll" value={formatCurrency(overview.total_payroll)} icon={IconWallet} tone="gold" />
        <MetricCard label="Sudah ditransfer" value={formatCurrency(overview.transferred)} icon={IconCheck} tone="green" />
        <MetricCard label="Masih menunggu" value={formatCurrency(overview.still_waiting)} icon={IconClockDollar} />
        <MetricCard label="Slip gaji terkirim" value={String(overview.payslips_sent)} icon={IconMailForward} tone="purple" />
      </>}
    </SimpleGrid>

    <Card className="surface-card filter-card" p="lg" mb="lg">
      <Group align="flex-end" wrap="wrap">
        <TextInput label="Cari" placeholder="Nama staff" value={query} onChange={(event) => setQuery(event.currentTarget.value)} flex={1} miw={200} />
        <TextInput type="month" label="Periode" value={periodFilter} onChange={(event) => setPeriodFilter(event.currentTarget.value)} w={170} />
        <Select label="Status" value={statusFilter} onChange={(value) => setStatusFilter(value as PayrollStatus | null)} data={[{ value: "", label: "Semua status" }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]} clearable w={150} />
      </Group>
    </Card>

    <Card className="surface-card table-card" p={0}>
      <Group p="lg" justify="space-between"><Box><Text className="section-title">Daftar payroll</Text><Text size="xs" c="dimmed">{total} pencatatan · draft dibuat otomatis setiap awal bulan untuk periode bulan sebelumnya</Text></Box></Group>
      <ScrollArea>
        <Table miw={1180} verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
          <Table.Thead><Table.Tr><Table.Th>Staff</Table.Th><Table.Th>Periode</Table.Th><Table.Th>Gaji pokok</Table.Th><Table.Th>Tunjangan</Table.Th><Table.Th>Reimbursement</Table.Th><Table.Th>Biaya admin</Table.Th><Table.Th>Total transfer</Table.Th><Table.Th>Status</Table.Th><Table.Th>Slip gaji</Table.Th><Table.Th /></Table.Tr></Table.Thead>
          <Table.Tbody>
            {listLoading && Array.from({ length: 5 }).map((_, index) => <Table.Tr key={index}><Table.Td colSpan={10}><Skeleton height={20} radius="sm" /></Table.Td></Table.Tr>)}
            {!listLoading && items.map((item) => {
              const editable = canWrite && item.status === "pending";
              return <Table.Tr key={item.id}>
                <Table.Td><Text size="sm" fw={600}>{item.staff.full_name}</Text><Text size="xs" c="dimmed">{item.staff.role_label}</Text></Table.Td>
                <Table.Td><Text size="sm">{periodLabel(item.period)}</Text>{item.auto_generated && <Badge size="xs" color="blue" variant="light">Otomatis</Badge>}</Table.Td>
                <Table.Td>{formatCurrency(item.base_salary)}</Table.Td>
                <Table.Td>{formatCurrency(item.allowance)}</Table.Td>
                <Table.Td><UnstyledButton onClick={() => showReimbursements(item)} aria-label={`Rincian reimbursement ${item.staff.full_name}`}><Text size="sm" td={item.reimbursement ? "underline" : undefined} c={item.reimbursement ? undefined : "dimmed"}>{formatCurrency(item.reimbursement)}</Text></UnstyledButton></Table.Td>
                <Table.Td c={item.admin_fee ? "red.7" : "dimmed"}>-{formatCurrency(item.admin_fee)}</Table.Td>
                <Table.Td fw={700}>{formatCurrency(item.total_transfer)}</Table.Td>
                <Table.Td>{statusMenu(item)}</Table.Td>
                <Table.Td>{item.payslip_sent_at ? <Badge size="xs" color="teal" variant="light">Terkirim</Badge> : <Badge size="xs" color="gray" variant="light">Belum</Badge>}</Table.Td>
                <Table.Td>
                  <Menu position="bottom-end">
                    <Menu.Target><ActionIcon variant="subtle" color="gray" aria-label={`Aksi ${item.staff.full_name}`}><IconDotsVertical size={17} /></ActionIcon></Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item component="a" href={payslipViewUrl(item.id)} target="_blank" rel="noreferrer" leftSection={<IconReceipt2 size={15} />}>Lihat slip gaji</Menu.Item>
                      <Menu.Item leftSection={<IconReceipt2 size={15} />} onClick={() => showReimbursements(item)}>Rincian reimbursement</Menu.Item>
                      {canWrite && <Menu.Item leftSection={<IconMailForward size={15} />} onClick={() => resend(item)}>Kirim ulang slip gaji</Menu.Item>}
                      {editable && <Menu.Item leftSection={<IconRefresh size={15} />} onClick={() => recalculate(item)}>Hitung ulang reimbursement</Menu.Item>}
                      {editable && <Menu.Item leftSection={<IconEdit size={15} />} onClick={() => open(item)}>Edit</Menu.Item>}
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
              </Table.Tr>;
            })}
            {!listLoading && !items.length && <Table.Tr><Table.Td colSpan={10}><Text size="sm" c="dimmed" ta="center" py="md">Belum ada payroll yang sesuai filter.</Text></Table.Td></Table.Tr>}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Card>

    <Modal opened={editing !== undefined} onClose={() => setEditing(undefined)} size="lg" centered title={<Text className="section-title">{editing ? "Edit payroll" : "Tambah payroll"}</Text>}>
      <Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select label="Staff" required searchable value={form.staff_id ? String(form.staff_id) : null} onChange={(value) => pickStaff(Number(value) || 0)} data={staffOptions.map((s) => ({ value: String(s.id), label: `${s.full_name} — ${s.role_label}` }))} />
          <TextInput type="month" label="Periode" required value={form.period} onChange={(event) => update("period", event.currentTarget.value)} />
          <NumberInput label="Gaji pokok" required min={0} value={form.base_salary} onChange={(value) => update("base_salary", Number(value) || 0)} prefix="Rp " thousandSeparator="." decimalSeparator="," />
          <NumberInput label="Tunjangan" min={0} value={form.allowance} onChange={(value) => update("allowance", Number(value) || 0)} prefix="Rp " thousandSeparator="." decimalSeparator="," />
          <NumberInput label="Reimbursement" description="Otomatis dari pengeluaran yang dibayar karyawan ini" readOnly variant="filled" value={formReimbursement} prefix="Rp " thousandSeparator="." decimalSeparator="," />
          <NumberInput label="Biaya admin transfer" description={!form.staff_id ? "Pilih staff dulu" : isBca(selectedBank) ? "Rekening BCA — tanpa biaya" : `Rekening ${selectedBank || "non-BCA"} — dipotong otomatis`} readOnly variant="filled" value={formAdminFee} prefix="Rp " thousandSeparator="." decimalSeparator="," />
        </SimpleGrid>
        <Card withBorder radius="md" p="md"><Group justify="space-between"><Text size="sm" c="dimmed">Total transfer</Text><Text fw={700} size="lg">{formatCurrency(totalTransfer)}</Text></Group><Text size="xs" c="dimmed" mt={4}>Reimbursement dihitung ulang saat disimpan: semua pengeluaran berstatus pending dengan sumber dana karyawan ini, bertanggal sampai akhir periode, yang belum masuk payroll lain.</Text></Card>
        <Textarea label="Catatan" minRows={3} value={form.notes ?? ""} onChange={(event) => update("notes", event.currentTarget.value)} />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={() => setEditing(undefined)}>Batal</Button>
          <Button className="primary-action" leftSection={<IconCheck size={16} />} onClick={submit}>Simpan payroll</Button>
        </Group>
      </Stack>
    </Modal>

    <Modal opened={Boolean(reimbursementTarget)} onClose={() => setReimbursementTarget(null)} size="lg" centered
      title={<Text className="section-title">Reimbursement {reimbursementTarget?.staff.full_name} · {reimbursementTarget ? periodLabel(reimbursementTarget.period) : ""}</Text>}>
      {reimbursementTarget && <Stack>
        {!reimbursements ? <Skeleton height={80} radius="md" /> : reimbursements.length ? <Table verticalSpacing="sm">
          <Table.Thead><Table.Tr><Table.Th>Tanggal</Table.Th><Table.Th>Referensi</Table.Th><Table.Th>Keterangan</Table.Th><Table.Th ta="right">Nominal</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>
            {reimbursements.map((expense) => <Table.Tr key={expense.id}>
              <Table.Td>{formatDate(expense.occurred_at)}</Table.Td>
              <Table.Td><Text size="xs" ff="monospace">{expense.reference}</Text></Table.Td>
              <Table.Td><Text size="sm">{expense.notes || expense.custom_category || EXPENSE_CATEGORY_LABELS[expense.category] || expense.category}</Text><Text size="xs" c="dimmed">{EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category}</Text></Table.Td>
              <Table.Td ta="right" fw={600}>{formatCurrency(expense.amount)}</Table.Td>
            </Table.Tr>)}
            <Table.Tr><Table.Td colSpan={3} fw={700}>Total reimbursement</Table.Td><Table.Td ta="right" fw={700}>{formatCurrency(reimbursements.reduce((sum, expense) => sum + expense.amount, 0))}</Table.Td></Table.Tr>
          </Table.Tbody>
        </Table> : <Text size="sm" c="dimmed">Belum ada pengeluaran karyawan ini yang masuk payroll periode ini. Catat pengeluaran di menu Pengeluaran dengan sumber dana karyawan.</Text>}
        <Group justify="space-between">
          <Button component="a" href="/finance/expenses" variant="subtle" color="dark">Buka Pengeluaran</Button>
          {canWrite && reimbursementTarget.status === "pending" && <Button variant="light" color="dark" leftSection={<IconRefresh size={16} />} onClick={() => recalculate(reimbursementTarget)}>Hitung ulang</Button>}
        </Group>
      </Stack>}
    </Modal>
  </>;
}
