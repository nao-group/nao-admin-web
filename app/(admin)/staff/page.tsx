"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionIcon, Avatar, Badge, Box, Button, Card, Group, Menu, Modal, ScrollArea, Select, SimpleGrid, Stack, Table, Text, TextInput, UnstyledButton } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconDotsVertical, IconEdit, IconMail, IconPhone, IconPlus, IconTrash, IconUserCheck, IconUsersGroup } from "@tabler/icons-react";
import { MetricCard, PageHeader, StatusBadge } from "@/components/ui/admin";
import { PhotoPreviewModal } from "@/components/ui/profile-photo-preview";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Staff } from "@/types/admin";
import { initials } from "../finance/utils";
import { deactivateStaff, getProvinces, getStaffOptions, listStaff, saveStaff } from "./api";
import { blankStaff, DEFAULT_CLASSES, StaffFields } from "./components/staff-fields";
import { PendingTeachers } from "./components/pending-teachers";

export default function StaffPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [classOptions, setClassOptions] = useState(DEFAULT_CLASSES);
  const [provinceOptions, setProvinceOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Staff>(blankStaff());
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("Semua peran");
  const [status, setStatus] = useState("Semua status");
  const [sortBy, setSortBy] = useState("Nama A–Z");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewStaff, setPreviewStaff] = useState<Staff | null>(null);

  useEffect(() => {
    Promise.all([listStaff(), getStaffOptions(), getProvinces()])
      .then(([items, classes, provinces]) => { setStaff(items); setClassOptions(classes.length ? classes : DEFAULT_CLASSES); setProvinceOptions(provinces); })
      .catch((error: Error) => notifications.show({ color: "red", title: "Data tim gagal dimuat", message: error.message }))
      .finally(() => setLoading(false));
  }, []);
  const filtered = useMemo(() => staff
    .filter((item) => (role === "Semua peran" || item.role === role) && (status === "Semua status" || item.status === status) && `${item.fullName} ${item.email} ${item.province}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sortBy === "Nama Z–A" ? b.fullName.localeCompare(a.fullName) : sortBy === "Gaji terbesar" ? (b.baseSalary + b.allowance) - (a.baseSalary + a.allowance) : sortBy === "Terbaru bergabung" ? b.joinDate.localeCompare(a.joinDate) : a.fullName.localeCompare(b.fullName)), [query, role, sortBy, staff, status]);
  const update = <K extends keyof Staff>(key: K, value: Staff[K]) => setForm((current) => ({ ...current, [key]: value }));
  const handlePhoto = (file: File | null) => { setPhotoFile(file); if (!file) { update("photoUrl", ""); return; } const reader = new FileReader(); reader.onload = () => update("photoUrl", String(reader.result)); reader.readAsDataURL(file); };
  const submit = async () => {
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim() || !form.bankAccount.trim() || !form.bankAccountName.trim() || !form.birthDate || !form.joinDate || !form.province.trim()) { notifications.show({ color: "red", message: "Lengkapi seluruh data wajib karyawan/guru." }); return; }
    if (saving) return;
    setSaving(true);
    try {
      const saved = await saveStaff(form, photoFile);
      setStaff((items) => [saved, ...items]);
      setCreating(false);
      notifications.show({ color: "teal", message: "Data karyawan/guru berhasil disimpan." });
      router.push(`/staff/${saved.id}`);
    } catch (error) { notifications.show({ color: "red", title: "Data gagal disimpan", message: error instanceof Error ? error.message : "Terjadi kesalahan." }); }
    finally { setSaving(false); }
  };
  const deactivate = async (item: Staff) => {
    try { const updated = await deactivateStaff(item.id); setStaff((items) => items.map((current) => current.id === updated.id ? updated : current)); notifications.show({ color: "yellow", message: `${item.fullName} dinonaktifkan.` }); }
    catch (error) { notifications.show({ color: "red", message: error instanceof Error ? error.message : "Status gagal diubah." }); }
  };

  return <>
    <PageHeader eyebrow="Tim" title="Karyawan & guru" description="Kelola profil, kompetensi pengajar, rekening, dan status seluruh tim NAO Group." action={<Button className="primary-action" leftSection={<IconPlus size={16} />} onClick={() => { setForm(blankStaff()); setPhotoFile(null); setCreating(true); }}>Tambah data</Button>} />
    <SimpleGrid cols={{ base: 1, xs: 2, xl: 4 }} mb="lg"><MetricCard label="Total tim" value={String(staff.length)} icon={IconUsersGroup} tone="gold" /><MetricCard label="Aktif" value={String(staff.filter((item) => item.status === "Active").length)} icon={IconUserCheck} tone="green" /><MetricCard label="Guru" value={String(staff.filter((item) => item.role === "Guru").length)} icon={IconUsersGroup} tone="purple" /><MetricCard label="Payroll aktif" value={formatCurrency(staff.filter((item) => item.status === "Active").reduce((sum, item) => sum + item.baseSalary + item.allowance, 0))} icon={IconCheck} /></SimpleGrid>
    <PendingTeachers onDecision={() => { void listStaff().then(setStaff).catch((error: Error) => notifications.show({ color: "red", message: error.message })); }} />
    <Card className="surface-card filter-card" p="lg" mb="lg"><Group align="flex-end" wrap="wrap"><TextInput label="Cari tim" placeholder="Nama, email, atau provinsi" value={query} onChange={(event) => setQuery(event.currentTarget.value)} flex={1} miw={220} /><Select label="Peran" value={role} onChange={(value) => setRole(value ?? "Semua peran")} data={["Semua peran", "Guru", "Karyawan", "C-Level"]} w={170} /><Select label="Status" value={status} onChange={(value) => setStatus(value ?? "Semua status")} data={["Semua status", "Active", "Inactive"]} w={155} /><Select label="Urutkan" value={sortBy} onChange={(value) => setSortBy(value ?? "Nama A–Z")} data={["Nama A–Z", "Nama Z–A", "Gaji terbesar", "Terbaru bergabung"]} w={170} /></Group></Card>
    <Card className="surface-card table-card" p={0}>
      <Group p="lg"><Box><Text className="section-title">Direktori tim</Text><Text size="xs" c="dimmed">{loading ? "Memuat data…" : `${filtered.length} orang · klik baris untuk melihat detail`}</Text></Box></Group>
      <ScrollArea><Table miw={1360} verticalSpacing="md" horizontalSpacing="lg" highlightOnHover><Table.Thead><Table.Tr><Table.Th style={{ minWidth: 260 }}>Nama</Table.Th><Table.Th>Peran</Table.Th><Table.Th style={{ minWidth: 245 }}>Kontak</Table.Th><Table.Th>Kelas yang ditangani</Table.Th><Table.Th>Level bahasa</Table.Th><Table.Th>Rekening</Table.Th><Table.Th>Tanggal bergabung</Table.Th><Table.Th>Status</Table.Th><Table.Th /></Table.Tr></Table.Thead><Table.Tbody>
        {filtered.map((item) => <Table.Tr key={item.id} className="clickable-row" tabIndex={0} onClick={() => router.push(`/staff/${item.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); router.push(`/staff/${item.id}`); } }}><Table.Td><Group gap="sm" wrap="nowrap">{item.photoUrl ? <UnstyledButton type="button" className="photo-preview-trigger" aria-label={`Lihat foto ${item.fullName}`} title={`Lihat foto ${item.fullName}`} onClick={(event) => { event.stopPropagation(); setPreviewStaff(item); }} onKeyDown={(event) => event.stopPropagation()}><Avatar src={item.photoUrl} color="yellow" radius="xl">{initials(item.fullName)}</Avatar></UnstyledButton> : <Avatar color="yellow" radius="xl" style={{ flexShrink: 0 }}>{initials(item.fullName)}</Avatar>}<Box><Text size="sm" fw={600}>{item.fullName}</Text><Text size="xs" c="dimmed">{item.province} · {formatDate(item.birthDate)}</Text></Box></Group></Table.Td><Table.Td><Badge variant="outline" color={item.role === "Guru" ? "yellow" : item.role === "C-Level" ? "dark" : "blue"}>{item.role}</Badge></Table.Td><Table.Td><Group gap={5} wrap="nowrap"><IconMail size={13} style={{ flexShrink: 0 }} /><Text size="xs">{item.email}</Text></Group><Group gap={5} mt={4} wrap="nowrap"><IconPhone size={13} style={{ flexShrink: 0 }} /><Text size="xs">{item.phone}</Text></Group></Table.Td><Table.Td><Text size="sm" fw={600}>{item.classes.length ? item.classes.join(", ") : "—"}</Text></Table.Td><Table.Td>{item.hskLevel}</Table.Td><Table.Td><Text size="sm" fw={600}>{item.bank}</Text><Text size="xs" c="dimmed">•••• {item.bankAccount.slice(-4)} · {item.bankAccountName}</Text></Table.Td><Table.Td><Text size="sm" fw={600}>{formatDate(item.joinDate)}</Text></Table.Td><Table.Td><StatusBadge status={item.status} /></Table.Td><Table.Td onClick={(event) => event.stopPropagation()}><Menu position="bottom-end"><Menu.Target><ActionIcon variant="subtle" color="gray" aria-label={`Aksi untuk ${item.fullName}`}><IconDotsVertical size={17} /></ActionIcon></Menu.Target><Menu.Dropdown><Menu.Item leftSection={<IconEdit size={15} />} onClick={() => router.push(`/staff/${item.id}?edit=1`)}>Edit</Menu.Item><Menu.Item color="yellow.8" leftSection={<IconTrash size={15} />} disabled={item.status === "Inactive"} onClick={() => { if (window.confirm("Nonaktifkan anggota tim ini?")) void deactivate(item); }}>Nonaktifkan</Menu.Item></Menu.Dropdown></Menu></Table.Td></Table.Tr>)}
        {!loading && !filtered.length && <Table.Tr><Table.Td colSpan={9}><Text size="sm" c="dimmed" ta="center" py="md">Tidak ada anggota tim yang sesuai filter.</Text></Table.Td></Table.Tr>}
      </Table.Tbody></Table></ScrollArea>
    </Card>
    <PhotoPreviewModal src={previewStaff?.photoUrl} name={previewStaff?.fullName ?? "anggota tim"} opened={Boolean(previewStaff)} onClose={() => setPreviewStaff(null)} />
    <Modal opened={creating} onClose={() => setCreating(false)} size="xl" centered title={<Text className="section-title">Tambah karyawan/guru</Text>}><Stack><StaffFields form={form} update={update} photoFile={photoFile} onPhotoChange={handlePhoto} classOptions={classOptions} provinceOptions={provinceOptions} /><Group justify="flex-end"><Button variant="subtle" color="gray" disabled={saving} onClick={() => setCreating(false)}>Batal</Button><Button className="primary-action" leftSection={<IconCheck size={16} />} loading={saving} onClick={submit}>Simpan data</Button></Group></Stack></Modal>
  </>;
}
