"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, Group, Modal, NumberInput, ScrollArea, Skeleton, Stack, Table, Text, Textarea, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconCheck, IconEdit, IconExternalLink, IconInfoCircle } from "@tabler/icons-react";
import { PageHeader } from "@/components/ui/admin";
import { formatCurrency, formatDate } from "@/lib/format";
import { primaryRole } from "@/lib/admin-access";
import { useAuthStore } from "@/store/auth";
import { listDokuFees, updateDokuFee } from "./api";
import type { DokuFeeRow } from "./types";

export default function DokuFeesPage() {
  const session = useAuthStore((state) => state.session);
  const canWrite = session ? primaryRole(session.roles) === "superadmin" : false;

  const [fees, setFees] = useState<DokuFeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<DokuFeeRow | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = () => {
    setLoading(true);
    void listDokuFees().then(setFees).catch(() => setFees([])).finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const submit = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await updateDokuFee(form.id, {
        method_label: form.method_label, percentage: form.percentage,
        fixed_amount: form.fixed_amount, note: form.note,
      });
      setForm(null);
      notifications.show({ color: "teal", message: "Tarif DOKU diperbarui. Transaksi baru akan memakai tarif ini." });
      refresh();
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "Gagal memperbarui tarif." });
    } finally {
      setSaving(false);
    }
  };

  const visibleFees = fees.filter((item) => item.channel_id !== "UNKNOWN");

  return <>
    <PageHeader eyebrow="Finance · Settings" title="DOKU payment fee" description="Atur tarif yang dipakai untuk menghitung pemasukan bersih transaksi ThinkNAO."
      action={<Button component="a" href="https://www.doku.com/harga" target="_blank" variant="light" color="dark" rightSection={<IconExternalLink size={16} />}>Lihat harga resmi</Button>} />

    <Alert color="yellow" variant="light" icon={<IconInfoCircle size={19} />} mb="lg" title="Konfigurasi admin">
      Tarif awal mengikuti halaman harga DOKU publik dan belum diverifikasi terhadap kontrak merchant aktual atau dashboard DOKU akun ini — akses ke dashboard/kredensial DOKU diperlukan untuk memastikan tarif ini akurat. Sampai saat itu, ubah nilai di bawah sesuai tarif kontrak yang berlaku.
    </Alert>

    <Card className="surface-card table-card" p={0}>
      <Group p="lg"><div><Text className="section-title">Tarif aktif</Text><Text size="xs" c="dimmed">Persentase dihitung dari gross amount, lalu ditambah fixed fee.</Text></div></Group>
      <ScrollArea>
        <Table miw={800} verticalSpacing="lg" horizontalSpacing="lg">
          <Table.Thead><Table.Tr><Table.Th>Metode pembayaran</Table.Th><Table.Th>Percentage fee</Table.Th><Table.Th>Fixed fee</Table.Th><Table.Th>Catatan</Table.Th><Table.Th>Terakhir diubah</Table.Th><Table.Th /></Table.Tr></Table.Thead>
          <Table.Tbody>
            {loading && Array.from({ length: 4 }).map((_, index) => <Table.Tr key={index}><Table.Td colSpan={6}><Skeleton height={20} radius="sm" /></Table.Td></Table.Tr>)}
            {!loading && visibleFees.map((item) => <Table.Tr key={item.id}>
              <Table.Td><Text fw={600}>{item.method_label}</Text></Table.Td>
              <Table.Td><Text fw={700}>{item.percentage.toLocaleString("id-ID")}%</Text></Table.Td>
              <Table.Td><Text fw={700}>{formatCurrency(item.fixed_amount)}</Text></Table.Td>
              <Table.Td><Text size="sm" c="dimmed" maw={320}>{item.note}</Text></Table.Td>
              <Table.Td>{formatDate(item.updated_at)}</Table.Td>
              <Table.Td>{canWrite && <Button variant="subtle" color="dark" size="xs" leftSection={<IconEdit size={14} />} onClick={() => setForm({ ...item })}>Edit</Button>}</Table.Td>
            </Table.Tr>)}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Card>

    <Alert color="blue" variant="light" icon={<IconAlertCircle size={18} />} mt="lg">
      Perubahan tarif tidak mengubah transaksi lama. Superadmin tetap bisa menyesuaikan fee pada transaksi ThinkNAO tersinkron DOKU secara individual lewat halaman Pemasukan bila diperlukan.
    </Alert>

    <Modal opened={Boolean(form)} onClose={() => setForm(null)} centered title={<Text className="section-title">Edit payment fee</Text>}>
      {form && <Stack>
        <TextInput label="Metode pembayaran" value={form.method_label} onChange={(event) => setForm({ ...form, method_label: event.currentTarget.value })} />
        <Group grow align="flex-start">
          <NumberInput label="Percentage fee" suffix="%" min={0} max={100} decimalScale={2} value={form.percentage} onChange={(value) => setForm({ ...form, percentage: Number(value) || 0 })} />
          <NumberInput label="Fixed fee" prefix="Rp " min={0} thousandSeparator="." decimalSeparator="," value={form.fixed_amount} onChange={(value) => setForm({ ...form, fixed_amount: Number(value) || 0 })} />
        </Group>
        <Textarea label="Catatan" minRows={3} value={form.note ?? ""} onChange={(event) => setForm({ ...form, note: event.currentTarget.value })} />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" disabled={saving} onClick={() => setForm(null)}>Batal</Button>
          <Button className="primary-action" loading={saving} leftSection={<IconCheck size={16} />} onClick={submit}>Simpan tarif</Button>
        </Group>
      </Stack>}
    </Modal>
  </>;
}
