"use client";

import { use, useEffect, useState } from "react";
import { Badge, Box, Button, Card, Group, SimpleGrid, Skeleton, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconEdit } from "@tabler/icons-react";
import { DetailItem, StatusBadge } from "@/components/ui/admin";
import { PreviewableAvatar } from "@/components/ui/profile-photo-preview";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Staff } from "@/types/admin";
import { initials } from "../../finance/utils";
import { getProvinces, getStaffMember, getStaffOptions, saveStaff } from "../api";
import { DEFAULT_CLASSES, StaffFields } from "../components/staff-fields";

export default function StaffDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const { id } = use(params);
  const { edit } = use(searchParams);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState<Staff | null>(null);
  const [classOptions, setClassOptions] = useState(DEFAULT_CLASSES);
  const [provinceOptions, setProvinceOptions] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [editing, setEditing] = useState(edit === "1");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getStaffMember(Number(id))
      .then((item) => { if (active) { setStaff(item); setForm({ ...item, classes: [...item.classes] }); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Detail anggota tim tidak dapat dimuat."); })
      .finally(() => { if (active) setLoading(false); });
    getStaffOptions().then((classes) => { if (active && classes.length) setClassOptions(classes); }).catch(() => {});
    getProvinces().then((provinces) => { if (active) setProvinceOptions(provinces); }).catch(() => {});
    return () => { active = false; };
  }, [id]);

  const update = <K extends keyof Staff>(key: K, value: Staff[K]) => setForm((current) => current ? { ...current, [key]: value } : current);
  const handlePhoto = (file: File | null) => {
    setPhotoFile(file);
    if (!file) { update("photoUrl", staff?.photoUrl ?? ""); return; }
    const reader = new FileReader();
    reader.onload = () => update("photoUrl", String(reader.result));
    reader.readAsDataURL(file);
  };
  const cancelEdit = () => {
    if (staff) setForm({ ...staff, classes: [...staff.classes] });
    setPhotoFile(null);
    setEditing(false);
  };
  const submit = async () => {
    if (!form || saving) return;
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim() || !form.bankAccount.trim() || !form.bankAccountName.trim() || !form.birthDate || !form.joinDate || !form.province.trim()) {
      notifications.show({ color: "red", message: "Lengkapi seluruh data wajib karyawan/guru." });
      return;
    }
    setSaving(true);
    try {
      const saved = await saveStaff(form, photoFile);
      setStaff(saved);
      setForm({ ...saved, classes: [...saved.classes] });
      setPhotoFile(null);
      setEditing(false);
      notifications.show({ color: "teal", message: "Data karyawan/guru berhasil disimpan." });
    } catch (cause) {
      notifications.show({ color: "red", title: "Data gagal disimpan", message: cause instanceof Error ? cause.message : "Terjadi kesalahan." });
    } finally { setSaving(false); }
  };

  return <>
    {loading && <Stack gap="lg"><Skeleton height={115} radius="md" /><Skeleton height={210} radius="md" /><Skeleton height={180} radius="md" /></Stack>}
    {!loading && error && <Card className="surface-card" p="lg"><Text c="red">{error}</Text></Card>}
    {!loading && staff && <Stack gap="lg">
      {editing && form ? <>
        <StaffFields form={form} update={update} photoFile={photoFile} onPhotoChange={handlePhoto} classOptions={Array.from(new Set([...classOptions, ...form.classes]))} provinceOptions={provinceOptions.length ? Array.from(new Set([...provinceOptions, form.province].filter(Boolean))) : [form.province].filter(Boolean)} />
        <Group justify="flex-end" mb="xl"><Button variant="subtle" color="gray" disabled={saving} onClick={cancelEdit}>Batal</Button><Button className="primary-action" leftSection={<IconCheck size={16} />} loading={saving} onClick={submit}>Simpan data</Button></Group>
      </> : <>
        <Card className="surface-card" p="lg">
          <Group className="detail-hero" p="lg" mb="lg" justify="space-between">
            <PreviewableAvatar src={staff.photoUrl} name={staff.fullName} fallback={initials(staff.fullName)} size={68} />
            <Box flex={1}><Text className="entity-title">{staff.fullName}</Text><Group gap="xs" mt={5}><Badge variant="outline" color={staff.role === "Guru" ? "yellow" : staff.role === "C-Level" ? "dark" : "blue"}>{staff.role}</Badge><StatusBadge status={staff.status} /></Group></Box>
            <Button className="primary-action" leftSection={<IconEdit size={16} />} onClick={() => setEditing(true)}>Edit data</Button>
          </Group>
          <Text className="section-title" mb="md">Profil & kontak</Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            <DetailItem label="Email" value={staff.email} /><DetailItem label="Nomor HP" value={staff.phone} /><DetailItem label="Asal provinsi" value={staff.province} />
            <DetailItem label="Tanggal lahir" value={formatDate(staff.birthDate)} /><DetailItem label="Tanggal bergabung" value={formatDate(staff.joinDate)} /><DetailItem label="Status pernikahan" value={staff.maritalStatus} />
          </SimpleGrid>
        </Card>
        {staff.role === "Guru" && <Card className="surface-card" p="lg"><Text className="section-title" mb="md">Pengajaran</Text><SimpleGrid cols={{ base: 1, sm: 2 }}><DetailItem label="Kelas yang ditangani" value={staff.classes.join(", ") || "—"} /><DetailItem label="Kemampuan bahasa" value={staff.hskLevel} /></SimpleGrid></Card>}
        <Card className="surface-card" p="lg"><Text className="section-title" mb="md">Rekening & payroll</Text><SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}><DetailItem label="Bank" value={staff.bank} /><DetailItem label="Nomor rekening" value={staff.bankAccount} /><DetailItem label="Rekening atas nama" value={staff.bankAccountName} /><DetailItem label="Gaji pokok" value={formatCurrency(staff.baseSalary)} /><DetailItem label="Tunjangan tetap" value={formatCurrency(staff.allowance)} /><DetailItem label="Total per bulan" value={formatCurrency(staff.baseSalary + staff.allowance)} /></SimpleGrid></Card>
      </>}
    </Stack>}
  </>;
}
