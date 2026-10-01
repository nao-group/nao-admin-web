"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon, Badge, Box, Button, Card, Group, Menu, Modal, NumberInput, ScrollArea, Select, SimpleGrid,
  Skeleton, Stack, Table, Text, Textarea, TextInput, UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck, IconChevronDown, IconClockDollar, IconDotsVertical, IconEdit, IconMailForward,
  IconPlus, IconReceipt2, IconWallet,
} from "@tabler/icons-react";
import { MetricCard, PageHeader } from "@/components/ui/admin";
import { formatCurrency } from "@/lib/format";
import { primaryRole } from "@/lib/admin-access";
import { useAuthStore } from "@/store/auth";
import {
  createPayroll, getPayrollOverview, listPayroll, listStaffOptions, payslipViewUrl, resendPayslip,
  updatePayroll, updatePayrollStatus,
} from "./api";
import type { PayrollOverview, PayrollRow, PayrollStatus, PayrollWritePayload, StaffOption } from "./types";

const PAGE_SIZE = 50;
const STATUS_OPTIONS: PayrollStatus[] = ["pending", "done"];
const STATUS_LABELS: Record<PayrollStatus, string> = { pending: "Pending", done: "Done" };

const currentPeriod = () => new Date().toISOString().slice(0, 7);

const blankForm = (): PayrollWritePayload => ({
  staff_id: 0, period: currentPeriod(), base_salary: 0, allowance: 0, reimbursement: 0, admin_fee: 0, notes: "",
});

export default function PayrollPage() {
  const session = useAuthStore((state) => state.session);
  const canWrite = session ? primaryRole(session.roles) === "superadmin" : false;

  const [items, setItems] = useState<PayrollRow[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [overview, setOverview] = useState<PayrollOverview | null>(null);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);

  const [periodFilter, setPeriodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<PayrollStatus | null>(null);
  const [query, setQuery] = useState("");

  const [editing, setEditing] = useState<PayrollRow | null | undefined>(undefined);
  const [form, setForm] = useState<PayrollWritePayload>(blankForm());

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
  }, []);

  const open = (item?: PayrollRow) => {
    setForm(item ? {
      staff_id: item.staff_id, period: item.period, base_salary: item.base_salary, allowance: item.allowance,
      reimbursement: item.reimbursement, admin_fee: item.admin_fee, notes: item.notes ?? "",
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

  const totalTransfer = Math.max(0, form.base_salary + form.allowance + form.reimbursement - form.admin_fee);

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
      action={canWrite && <Button className="primary-action" leftSection={<IconPlus size={16} />} onClick={() => open()}>Tambah payroll</Button>} />

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
      <Group p="lg" justify="space-between"><Box><Text className="section-title">Daftar payroll</Text><Text size="xs" c="dimmed">{total} pencatatan</Text></Box></Group>
      <ScrollArea>
        <Table miw={1180} verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
          <Table.Thead><Table.Tr><Table.Th>Staff</Table.Th><Table.Th>Periode</Table.Th><Table.Th>Gaji pokok</Table.Th><Table.Th>Tunjangan</Table.Th><Table.Th>Reimbursement</Table.Th><Table.Th>Biaya admin</Table.Th><Table.Th>Total transfer</Table.Th><Table.Th>Status</Table.Th><Table.Th>Slip gaji</Table.Th><Table.Th /></Table.Tr></Table.Thead>
          <Table.Tbody>
            {listLoading && Array.from({ length: 5 }).map((_, index) => <Table.Tr key={index}><Table.Td colSpan={10}><Skeleton height={20} radius="sm" /></Table.Td></Table.Tr>)}
            {!listLoading && items.map((item) => {
              const editable = canWrite && item.status === "pending";
              return <Table.Tr key={item.id}>
                <Table.Td><Text size="sm" fw={600}>{item.staff.full_name}</Text><Text size="xs" c="dimmed">{item.staff.role_label}</Text></Table.Td>
                <Table.Td>{item.period}</Table.Td>
                <Table.Td>{formatCurrency(item.base_salary)}</Table.Td>
                <Table.Td>{formatCurrency(item.allowance)}</Table.Td>
                <Table.Td>{formatCurrency(item.reimbursement)}</Table.Td>
                <Table.Td c={item.admin_fee ? "red.7" : "dimmed"}>-{formatCurrency(item.admin_fee)}</Table.Td>
                <Table.Td fw={700}>{formatCurrency(item.total_transfer)}</Table.Td>
                <Table.Td>{statusMenu(item)}</Table.Td>
                <Table.Td>{item.payslip_sent_at ? <Badge size="xs" color="teal" variant="light">Terkirim</Badge> : <Badge size="xs" color="gray" variant="light">Belum</Badge>}</Table.Td>
                <Table.Td>
                  <Menu position="bottom-end">
                    <Menu.Target><ActionIcon variant="subtle" color="gray" aria-label={`Aksi ${item.staff.full_name}`}><IconDotsVertical size={17} /></ActionIcon></Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item component="a" href={payslipViewUrl(item.id)} target="_blank" rel="noreferrer" leftSection={<IconReceipt2 size={15} />}>Lihat slip gaji</Menu.Item>
                      {canWrite && <Menu.Item leftSection={<IconMailForward size={15} />} onClick={() => resend(item)}>Kirim ulang slip gaji</Menu.Item>}
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
          <NumberInput label="Reimbursement" min={0} value={form.reimbursement} onChange={(value) => update("reimbursement", Number(value) || 0)} prefix="Rp " thousandSeparator="." decimalSeparator="," />
          <NumberInput label="Biaya admin transfer" min={0} value={form.admin_fee} onChange={(value) => update("admin_fee", Number(value) || 0)} prefix="Rp " thousandSeparator="." decimalSeparator="," />
        </SimpleGrid>
        <Card withBorder radius="md" p="md"><Group justify="space-between"><Text size="sm" c="dimmed">Total transfer</Text><Text fw={700} size="lg">{formatCurrency(totalTransfer)}</Text></Group></Card>
        <Textarea label="Catatan" minRows={3} value={form.notes ?? ""} onChange={(event) => update("notes", event.currentTarget.value)} />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={() => setEditing(undefined)}>Batal</Button>
          <Button className="primary-action" leftSection={<IconCheck size={16} />} onClick={submit}>Simpan payroll</Button>
        </Group>
      </Stack>
    </Modal>
  </>;
}
