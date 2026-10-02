"use client";

import { Box, Card, Chip, FileInput, Group, NumberInput, Select, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconUpload } from "@tabler/icons-react";
import type { Staff } from "@/types/admin";
import { PreviewableAvatar } from "@/components/ui/profile-photo-preview";
import { initials } from "../../finance/utils";

export const DEFAULT_CLASSES = ["Mathematics (Chinese)", "Physics (Chinese)", "Chemistry (Chinese)", "Mathematics (English)", "Physics (English)", "Chemistry (English)", "STEM Chinese", "Humanities Chinese"];

export const blankStaff = (): Staff => ({ id: 0, fullName: "", email: "", phone: "", role: "Guru", classes: [], bankAccount: "", bankAccountName: "", bank: "BCA", birthDate: "", joinDate: "", photoUrl: "", status: "Active", maritalStatus: "Belum menikah", province: "", hskLevel: "—", baseSalary: 0, allowance: 0 });

export function StaffFields({ form, update, photoFile, onPhotoChange, classOptions, provinceOptions }: {
  form: Staff;
  update: <K extends keyof Staff>(key: K, value: Staff[K]) => void;
  photoFile: File | null;
  onPhotoChange: (file: File | null) => void;
  classOptions: string[];
  provinceOptions: string[];
}) {
  return <Stack gap="lg">
    <Group align="center" wrap="nowrap">
      <PreviewableAvatar src={form.photoUrl} name={form.fullName || "anggota tim"} fallback={form.fullName ? initials(form.fullName) : "NA"} size={74} />
      <FileInput label="Foto" placeholder="Upload JPG/PNG" accept="image/png,image/jpeg" value={photoFile} onChange={onPhotoChange} leftSection={<IconUpload size={16} />} flex={1} />
    </Group>
    <Card withBorder radius="md" p="lg">
      <Text className="section-title" mb="md">Profil & kontak</Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <TextInput label="Nama lengkap" required value={form.fullName} onChange={(event) => update("fullName", event.currentTarget.value)} />
        <TextInput label="Email" type="email" required value={form.email} onChange={(event) => update("email", event.currentTarget.value)} />
        <TextInput label="Nomor HP" required value={form.phone} onChange={(event) => update("phone", event.currentTarget.value)} />
        <Select label="Peran" required value={form.role} onChange={(value) => update("role", (value ?? "Guru") as Staff["role"])} data={["Guru", "Karyawan", "C-Level"]} />
        <DatePickerInput label="Tanggal lahir" placeholder="Pilih tanggal lahir" required value={form.birthDate} onChange={(value) => update("birthDate", value ?? "")} valueFormat="DD MMMM YYYY" clearable={false} />
        <DatePickerInput label="Tanggal bergabung" placeholder="Pilih tanggal bergabung" required value={form.joinDate} onChange={(value) => update("joinDate", value ?? "")} valueFormat="DD MMMM YYYY" clearable={false} />
        <Select label="Asal provinsi" placeholder="Pilih provinsi" required searchable value={form.province} onChange={(value) => update("province", value ?? "")} data={provinceOptions} nothingFoundMessage="Provinsi tidak ditemukan" />
        <Select label="Status pernikahan" value={form.maritalStatus} onChange={(value) => update("maritalStatus", (value ?? "Belum menikah") as Staff["maritalStatus"])} data={["Belum menikah", "Menikah"]} />
        <Select label="Status" value={form.status} onChange={(value) => update("status", (value ?? "Active") as Staff["status"])} data={["Active", "Inactive"]} />
      </SimpleGrid>
    </Card>
    {form.role === "Guru" && <Card withBorder radius="md" p="lg">
      <Text className="section-title" mb="md">Data pengajaran</Text>
      <Stack gap="md">
        <Box><Text size="sm" fw={500} mb={8}>Kelas yang ditangani</Text><Chip.Group multiple value={form.classes} onChange={(value) => update("classes", value)}><Group gap="xs">{classOptions.map((option) => <Chip key={option} value={option} variant="outline">{option}</Chip>)}</Group></Chip.Group></Box>
        <Select label="Kemampuan bahasa guru" value={form.hskLevel} onChange={(value) => update("hskLevel", value ?? "—")} data={["—", "HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"]} />
      </Stack>
    </Card>}
    <Card withBorder radius="md" p="lg">
      <Text className="section-title" mb="md">Rekening & payroll</Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Select label="Bank" required searchable value={form.bank} onChange={(value) => update("bank", value ?? "BCA")} data={["BCA", "BNI", "BRI", "Mandiri", "CIMB Niaga", "BSI", "Permata"]} />
        <TextInput label="Nomor rekening" required value={form.bankAccount} onChange={(event) => update("bankAccount", event.currentTarget.value)} />
        <TextInput label="Rekening atas nama" required value={form.bankAccountName} onChange={(event) => update("bankAccountName", event.currentTarget.value.toUpperCase())} />
        <NumberInput label="Gaji pokok" min={0} value={form.baseSalary} onChange={(value) => update("baseSalary", Number(value) || 0)} prefix="Rp " thousandSeparator="." decimalSeparator="," />
        <NumberInput label="Tunjangan tetap" min={0} value={form.allowance} onChange={(value) => update("allowance", Number(value) || 0)} prefix="Rp " thousandSeparator="." decimalSeparator="," />
      </SimpleGrid>
      {form.bank !== "BCA" && <Text size="xs" c="yellow.8" mt="sm">Penerima menanggung admin fee Rp2.500 pada setiap payroll.</Text>}
    </Card>
  </Stack>;
}
