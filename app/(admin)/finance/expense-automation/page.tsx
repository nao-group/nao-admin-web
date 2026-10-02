"use client";

import { useEffect, useState } from "react";
import { ActionIcon, Badge, Box, Button, Card, Group, Menu, Modal, NumberInput, ScrollArea, SegmentedControl, Select, SimpleGrid, Skeleton, Stack, Switch, Table, Text, Textarea, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconDotsVertical, IconEdit, IconPlayerPlay, IconPlus, IconTrash } from "@tabler/icons-react";
import { PageHeader } from "@/components/ui/admin";
import { formatCurrency } from "@/lib/format";
import { primaryRole } from "@/lib/admin-access";
import { useAuthStore } from "@/store/auth";
import {
  createAutoExpenseRule, deleteAutoExpenseRule, listAutoExpenseRules, runAutoExpenseRulesNow,
  setAutoExpenseRuleActive, updateAutoExpenseRule,
} from "./api";
import type { AutoExpenseCategory, AutoExpenseFrequency, AutoExpenseRuleRow, AutoExpenseRuleWritePayload } from "./types";

const CATEGORY_LABELS: Record<AutoExpenseCategory, string> = { payroll: "Gaji", bank_fee: "Biaya admin bank", maintenance: "Maintenance", other: "Lainnya" };
const CATEGORY_OPTIONS: { value: AutoExpenseCategory; label: string }[] = [
  { value: "payroll", label: "Gaji" }, { value: "bank_fee", label: "Biaya admin bank" },
  { value: "maintenance", label: "Maintenance" }, { value: "other", label: "Lainnya" },
];

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
// 29 Feb is excluded so a yearly rule fires every year — same limits as the backend (models/admin/finance.py).
const YEARLY_MAX_DAY = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTHLY_MAX_DAY = 28;
const FREQUENCY_OPTIONS: { value: AutoExpenseFrequency; label: string }[] = [
  { value: "weekly", label: "Mingguan" }, { value: "monthly", label: "Bulanan" }, { value: "yearly", label: "Tahunan" },
];

const blankForm = (): AutoExpenseRuleWritePayload => ({
  name: "", category: "maintenance", amount: 0, frequency: "monthly", day_of_week: null, day_of_month: 1, month_of_year: null,
  paid_by: "NAO Group", notes: "", active: true,
});

const scheduleLabel = (rule: Pick<AutoExpenseRuleRow, "frequency" | "day_of_week" | "day_of_month" | "month_of_year">) => {
  if (rule.frequency === "weekly") return `Setiap hari ${DAYS[(rule.day_of_week ?? 1) - 1]}`;
  if (rule.frequency === "yearly") return `Setiap ${rule.day_of_month ?? 1} ${MONTHS[(rule.month_of_year ?? 1) - 1]}`;
  return `Tanggal ${rule.day_of_month ?? 1} setiap bulan`;
};

type FormErrors = Partial<Record<keyof AutoExpenseRuleWritePayload, string>>;

function validate(form: AutoExpenseRuleWritePayload): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Nama aturan wajib diisi.";
  else if (form.name.trim().length > 150) errors.name = "Nama aturan maksimal 150 karakter.";
  if (!form.paid_by.trim()) errors.paid_by = "Sumber dana wajib diisi.";
  if (!Number.isInteger(form.amount) || form.amount <= 0) errors.amount = "Nominal harus lebih dari Rp 0.";
  if (form.frequency === "weekly" && !form.day_of_week) errors.day_of_week = "Pilih hari pembuatan.";
  if (form.frequency === "monthly" && (!form.day_of_month || form.day_of_month < 1 || form.day_of_month > MONTHLY_MAX_DAY)) {
    errors.day_of_month = `Tanggal harus 1–${MONTHLY_MAX_DAY}.`;
  }
  if (form.frequency === "yearly") {
    if (!form.month_of_year) errors.month_of_year = "Pilih bulan pembuatan.";
    const maxDay = form.month_of_year ? YEARLY_MAX_DAY[form.month_of_year - 1] : 31;
    if (!form.day_of_month || form.day_of_month < 1 || form.day_of_month > maxDay) {
      errors.day_of_month = form.month_of_year ? `${MONTHS[form.month_of_year - 1]} hanya punya tanggal 1–${maxDay}.` : "Pilih tanggal pembuatan.";
    }
  }
  return errors;
}

export default function ExpenseAutomationPage() {
  const session = useAuthStore((state) => state.session);
  const canWrite = session ? primaryRole(session.roles) === "superadmin" : false;

  const [rules, setRules] = useState<AutoExpenseRuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [editing, setEditing] = useState<AutoExpenseRuleRow | null | undefined>(undefined);
  const [form, setForm] = useState<AutoExpenseRuleWritePayload>(blankForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const refresh = () => {
    setLoading(true);
    void listAutoExpenseRules().then(setRules).catch(() => setRules([])).finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const open = (item?: AutoExpenseRuleRow) => {
    setForm(item ? {
      name: item.name, category: item.category, amount: item.amount, frequency: item.frequency ?? "monthly",
      day_of_week: item.day_of_week, day_of_month: item.day_of_month, month_of_year: item.month_of_year,
      paid_by: item.paid_by, notes: item.notes ?? "", active: item.active,
    } : blankForm());
    setErrors({});
    setEditing(item ?? null);
  };
  const update = <K extends keyof AutoExpenseRuleWritePayload>(key: K, value: AutoExpenseRuleWritePayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  // Seeds sensible defaults for the newly relevant fields, keeping the current day where it still fits.
  const changeFrequency = (frequency: AutoExpenseFrequency) => {
    setForm((current) => ({
      ...current, frequency,
      day_of_week: frequency === "weekly" ? current.day_of_week ?? 1 : null,
      month_of_year: frequency === "yearly" ? current.month_of_year ?? 1 : null,
      day_of_month: frequency === "weekly" ? null : Math.min(current.day_of_month ?? 1, frequency === "monthly" ? MONTHLY_MAX_DAY : 31),
    }));
    setErrors({});
  };

  const submit = async () => {
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      notifications.show({ color: "red", message: "Periksa kembali isian aturan yang ditandai." });
      return;
    }
    const payload: AutoExpenseRuleWritePayload = {
      ...form, name: form.name.trim(), paid_by: form.paid_by.trim(), notes: form.notes?.trim() || null,
      day_of_week: form.frequency === "weekly" ? form.day_of_week : null,
      day_of_month: form.frequency === "weekly" ? null : form.day_of_month,
      month_of_year: form.frequency === "yearly" ? form.month_of_year : null,
    };
    setSaving(true);
    try {
      if (editing) await updateAutoExpenseRule(editing.id, payload); else await createAutoExpenseRule(payload);
      setEditing(undefined);
      notifications.show({ color: "teal", message: "Aturan pengeluaran otomatis disimpan." });
      refresh();
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "Gagal menyimpan aturan." });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: AutoExpenseRuleRow, active: boolean) => {
    try {
      await setAutoExpenseRuleActive(item.id, active);
      notifications.show({ color: active ? "teal" : "gray", message: `${item.name} ${active ? "diaktifkan" : "dinonaktifkan"}.` });
      refresh();
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "Gagal mengubah status aturan." });
    }
  };

  const remove = async (item: AutoExpenseRuleRow) => {
    if (!window.confirm(`Hapus aturan "${item.name}"? Transaksi yang sudah dibuat sebelumnya tidak akan terhapus.`)) return;
    try {
      await deleteAutoExpenseRule(item.id);
      notifications.show({ color: "teal", message: "Aturan dihapus." });
      refresh();
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "Gagal menghapus aturan." });
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const { created } = await runAutoExpenseRulesNow();
      notifications.show({ color: "teal", message: created ? `${created} transaksi pengeluaran dibuat.` : "Tidak ada aturan yang perlu dibuat saat ini." });
      refresh();
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "Gagal menjalankan otomasi." });
    } finally {
      setRunning(false);
    }
  };

  return <>
    <PageHeader eyebrow="Finance · Konfigurasi" title="Otomasi pengeluaran" description="Kelola pengeluaran berulang; sistem otomatis membuat transaksi setiap minggu, bulan, atau tahun sesuai jadwal."
      action={canWrite && <Group>
        <Button variant="light" color="dark" loading={running} leftSection={<IconPlayerPlay size={16} />} onClick={runNow}>Jalankan sekarang</Button>
        <Button className="primary-action" leftSection={<IconPlus size={16} />} onClick={() => open()}>Tambah aturan</Button>
      </Group>} />

    <Card className="surface-card table-card" p={0}>
      <Group p="lg" justify="space-between">
        <Box><Text className="section-title">Aturan otomatis</Text><Text size="xs" c="dimmed">Sistem membuat transaksi berstatus pending saat jadwal tiba, mulai dari periode setelah aturan dibuat.</Text></Box>
        <Badge color="teal" variant="light">{rules.filter((item) => item.active).length} aktif</Badge>
      </Group>
      <ScrollArea>
        <Table miw={900} verticalSpacing="lg" horizontalSpacing="lg" highlightOnHover>
          <Table.Thead><Table.Tr><Table.Th>Nama aturan</Table.Th><Table.Th>Jenis pengeluaran</Table.Th><Table.Th>Jadwal pembuatan</Table.Th><Table.Th>Sumber dana</Table.Th><Table.Th>Nominal</Table.Th><Table.Th>Status</Table.Th><Table.Th /></Table.Tr></Table.Thead>
          <Table.Tbody>
            {loading && Array.from({ length: 3 }).map((_, index) => <Table.Tr key={index}><Table.Td colSpan={7}><Skeleton height={20} radius="sm" /></Table.Td></Table.Tr>)}
            {!loading && rules.map((item) => <Table.Tr key={item.id}>
              <Table.Td><Text fw={600}>{item.name}</Text><Text size="xs" c="dimmed">{item.notes || "Tanpa catatan"}</Text></Table.Td>
              <Table.Td><Badge variant="outline" color="dark">{CATEGORY_LABELS[item.category]}</Badge></Table.Td>
              <Table.Td><Text size="sm">{scheduleLabel(item)}</Text><Text size="xs" c="dimmed">{FREQUENCY_OPTIONS.find((option) => option.value === item.frequency)?.label}</Text></Table.Td>
              <Table.Td>{item.paid_by}</Table.Td>
              <Table.Td fw={700}>{formatCurrency(item.amount)}</Table.Td>
              <Table.Td>{canWrite
                ? <Switch checked={item.active} onChange={(event) => toggleActive(item, event.currentTarget.checked)} color="teal" label={item.active ? "Aktif" : "Nonaktif"} />
                : <Badge color={item.active ? "teal" : "gray"} variant="light">{item.active ? "Aktif" : "Nonaktif"}</Badge>}
              </Table.Td>
              <Table.Td>{canWrite && <Menu position="bottom-end">
                <Menu.Target><ActionIcon variant="subtle" color="gray" aria-label={`Aksi ${item.name}`}><IconDotsVertical size={16} /></ActionIcon></Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => open(item)}>Edit</Menu.Item>
                  <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => remove(item)}>Hapus</Menu.Item>
                </Menu.Dropdown>
              </Menu>}</Table.Td>
            </Table.Tr>)}
            {!loading && !rules.length && <Table.Tr><Table.Td colSpan={7}><Text size="sm" c="dimmed" ta="center" py="md">Belum ada aturan otomatis.</Text></Table.Td></Table.Tr>}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Card>

    <Modal opened={editing !== undefined} onClose={() => setEditing(undefined)} centered title={<Text className="section-title">{editing ? "Edit aturan" : "Tambah aturan"}</Text>}>
      <Stack>
        <TextInput label="Nama aturan" required maxLength={150} value={form.name} error={errors.name} onChange={(event) => update("name", event.currentTarget.value)} />
        <Select label="Jenis pengeluaran" required allowDeselect={false} value={form.category} onChange={(value) => update("category", (value ?? "other") as AutoExpenseCategory)} data={CATEGORY_OPTIONS} />
        {form.category === "payroll" && <Text size="xs" c="orange.8" mt={-8}>Gaji staff sudah tercatat otomatis saat payroll ditandai done — pakai kategori ini hanya untuk biaya gaji di luar modul Payroll agar tidak tercatat dua kali.</Text>}
        <NumberInput label="Nominal" required min={1} allowDecimal={false} allowNegative={false} value={form.amount} error={errors.amount} onChange={(value) => update("amount", Number(value) || 0)} prefix="Rp " thousandSeparator="." decimalSeparator="," />
        <Box>
          <Text size="sm" fw={500} mb={6}>Frekuensi</Text>
          <SegmentedControl fullWidth value={form.frequency} onChange={(value) => changeFrequency(value as AutoExpenseFrequency)} data={FREQUENCY_OPTIONS} />
        </Box>
        {form.frequency === "weekly" && <Select label="Dibuat setiap hari" required allowDeselect={false} value={form.day_of_week ? String(form.day_of_week) : null} error={errors.day_of_week} onChange={(value) => update("day_of_week", value ? Number(value) : null)} data={DAYS.map((label, index) => ({ value: String(index + 1), label }))} />}
        {form.frequency === "monthly" && <NumberInput label="Dibuat setiap tanggal" description={`Tanggal 1–${MONTHLY_MAX_DAY} agar selalu tersedia setiap bulan`} required min={1} max={MONTHLY_MAX_DAY} allowDecimal={false} allowNegative={false} clampBehavior="strict" value={form.day_of_month ?? ""} error={errors.day_of_month} onChange={(value) => update("day_of_month", value === "" ? null : Number(value))} />}
        {form.frequency === "yearly" && <SimpleGrid cols={2}>
          <Select label="Bulan" required allowDeselect={false} value={form.month_of_year ? String(form.month_of_year) : null} error={errors.month_of_year} onChange={(value) => update("month_of_year", value ? Number(value) : null)} data={MONTHS.map((label, index) => ({ value: String(index + 1), label }))} />
          <NumberInput label="Tanggal" description={form.month_of_year ? `1–${YEARLY_MAX_DAY[form.month_of_year - 1]}` : "Pilih bulan dulu"} required min={1} max={form.month_of_year ? YEARLY_MAX_DAY[form.month_of_year - 1] : 31} allowDecimal={false} allowNegative={false} value={form.day_of_month ?? ""} error={errors.day_of_month} onChange={(value) => update("day_of_month", value === "" ? null : Number(value))} />
        </SimpleGrid>}
        {!Object.values(errors).some(Boolean) && <Text size="xs" c="dimmed" mt={-6}>Jadwal: {scheduleLabel(form)}</Text>}
        <TextInput label="Sumber dana" required maxLength={200} value={form.paid_by} error={errors.paid_by} onChange={(event) => update("paid_by", event.currentTarget.value)} />
        <Textarea label="Catatan" minRows={3} maxLength={1000} value={form.notes ?? ""} onChange={(event) => update("notes", event.currentTarget.value)} />
        <Switch label="Aktifkan aturan ini" checked={form.active} onChange={(event) => update("active", event.currentTarget.checked)} />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={() => setEditing(undefined)}>Batal</Button>
          <Button className="primary-action" loading={saving} leftSection={<IconCheck size={16} />} onClick={submit}>Simpan aturan</Button>
        </Group>
      </Stack>
    </Modal>
  </>;
}
