"use client";

import { useEffect, useState } from "react";
import { ActionIcon, Badge, Box, Button, Card, Group, Menu, Modal, NumberInput, ScrollArea, Select, Skeleton, Stack, Switch, Table, Text, Textarea, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconDotsVertical, IconEdit, IconPlayerPlay, IconPlus, IconTrash } from "@tabler/icons-react";
import { PageHeader } from "@/components/ui/admin";
import { formatCurrency } from "@/lib/format";
import { primaryRole } from "@/lib/admin-access";
import { useAuthStore } from "@/store/auth";
import type { ExpenseCategory } from "../expenses/types";
import {
  createAutoExpenseRule, deleteAutoExpenseRule, listAutoExpenseRules, runAutoExpenseRulesNow,
  setAutoExpenseRuleActive, updateAutoExpenseRule,
} from "./api";
import type { AutoExpenseRuleRow, AutoExpenseRuleWritePayload } from "./types";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = { payroll: "Gaji", bank_fee: "Biaya admin bank", maintenance: "Maintenance", other: "Lainnya" };
const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: "payroll", label: "Gaji" }, { value: "bank_fee", label: "Biaya admin bank" },
  { value: "maintenance", label: "Maintenance" }, { value: "other", label: "Lainnya" },
];

const blankForm = (): AutoExpenseRuleWritePayload => ({
  name: "", category: "maintenance", amount: 0, day_of_month: 1, paid_by: "NAO Group", notes: "", active: true,
});

export default function ExpenseAutomationPage() {
  const session = useAuthStore((state) => state.session);
  const canWrite = session ? primaryRole(session.roles) === "superadmin" : false;

  const [rules, setRules] = useState<AutoExpenseRuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [editing, setEditing] = useState<AutoExpenseRuleRow | null | undefined>(undefined);
  const [form, setForm] = useState<AutoExpenseRuleWritePayload>(blankForm());

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
      name: item.name, category: item.category, amount: item.amount, day_of_month: item.day_of_month ?? 1,
      paid_by: item.paid_by, notes: item.notes ?? "", active: item.active,
    } : blankForm());
    setEditing(item ?? null);
  };
  const update = <K extends keyof AutoExpenseRuleWritePayload>(key: K, value: AutoExpenseRuleWritePayload[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (!form.name.trim() || !form.paid_by.trim() || form.amount <= 0) {
      notifications.show({ color: "red", message: "Nama aturan, sumber dana, dan nominal wajib diisi." });
      return;
    }
    try {
      if (editing) await updateAutoExpenseRule(editing.id, form); else await createAutoExpenseRule(form);
      setEditing(undefined);
      notifications.show({ color: "teal", message: "Aturan pengeluaran otomatis disimpan." });
      refresh();
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "Gagal menyimpan aturan." });
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
    <PageHeader eyebrow="Finance · Konfigurasi" title="Otomasi pengeluaran" description="Kelola pengeluaran berulang; sistem otomatis membuat transaksi setiap bulan pada tanggal yang ditentukan."
      action={canWrite && <Group>
        <Button variant="light" color="dark" loading={running} leftSection={<IconPlayerPlay size={16} />} onClick={runNow}>Jalankan sekarang</Button>
        <Button className="primary-action" leftSection={<IconPlus size={16} />} onClick={() => open()}>Tambah aturan</Button>
      </Group>} />

    <Card className="surface-card table-card" p={0}>
      <Group p="lg" justify="space-between">
        <Box><Text className="section-title">Aturan otomatis</Text><Text size="xs" c="dimmed">Sistem membuat transaksi berstatus pending pada tanggal yang ditentukan setiap bulan.</Text></Box>
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
              <Table.Td>Tanggal {item.day_of_month ?? 1} setiap bulan</Table.Td>
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
        <TextInput label="Nama aturan" required value={form.name} onChange={(event) => update("name", event.currentTarget.value)} />
        <Select label="Jenis pengeluaran" required value={form.category} onChange={(value) => update("category", (value ?? "other") as ExpenseCategory)} data={CATEGORY_OPTIONS} />
        <NumberInput label="Nominal" required min={0} value={form.amount} onChange={(value) => update("amount", Number(value) || 0)} prefix="Rp " thousandSeparator="." decimalSeparator="," />
        <NumberInput label="Dibuat setiap tanggal" description="Tanggal 1–28 agar selalu tersedia setiap bulan" required min={1} max={28} value={form.day_of_month} onChange={(value) => update("day_of_month", Number(value) || 1)} />
        <TextInput label="Sumber dana" required value={form.paid_by} onChange={(event) => update("paid_by", event.currentTarget.value)} />
        <Textarea label="Catatan" minRows={3} value={form.notes ?? ""} onChange={(event) => update("notes", event.currentTarget.value)} />
        <Switch label="Aktifkan aturan ini" checked={form.active} onChange={(event) => update("active", event.currentTarget.checked)} />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={() => setEditing(undefined)}>Batal</Button>
          <Button className="primary-action" leftSection={<IconCheck size={16} />} onClick={submit}>Simpan aturan</Button>
        </Group>
      </Stack>
    </Modal>
  </>;
}
