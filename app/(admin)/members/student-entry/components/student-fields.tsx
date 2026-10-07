"use client";
import { Card, Select, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { GRADES } from "../data";
import { localWhatsApp } from "../parse";
import type { StudentDraft, StudentField } from "../types";
export function StudentFields({ draft, errors, update, provinces, provinceError }: {
  draft: StudentDraft; errors: Partial<Record<StudentField, string>>;
  update: (key: StudentField, value: string) => void; provinces: string[]; provinceError: string;
}) {
  const input = (key: StudentField, label: string, placeholder: string, required = false, email = false) =>
    <TextInput key={key} label={label} placeholder={placeholder} required={required} type={email ? "email" : "text"} value={draft[key]} error={errors[key]} maxLength={200} onChange={(event) => update(key, event.currentTarget.value)} />;
  return <Stack gap="lg">
    <Card withBorder radius="md" p="lg"><Text fw={700} mb="md">Identitas & kontak</Text><SimpleGrid cols={{ base: 1, sm: 2 }}>
      {input("full_name", "Nama lengkap", "Nama lengkap murid", true)}
      {input("email", "Email murid", "student@example.com", true, true)}
      <TextInput label="WhatsApp" placeholder="81234567890" required leftSection={<Text size="sm">+62</Text>} leftSectionWidth={48} inputMode="tel" value={draft.whatsapp} error={errors.whatsapp} maxLength={20} onChange={(event) => update("whatsapp", localWhatsApp(event.currentTarget.value))} />
      {input("parent_email", "Email orang tua", "parent@example.com", false, true)}
    </SimpleGrid></Card>
    <Card withBorder radius="md" p="lg"><Text fw={700} mb="md">Pendidikan & tujuan</Text><SimpleGrid cols={{ base: 1, sm: 2 }}>
      <Select label="Grade" required data={GRADES} value={draft.grade} error={errors.grade} onChange={(value) => update("grade", value || "Grade 12")} />
      <Select label="Provinsi" placeholder="Pilih provinsi" searchable clearable data={[...new Set([...provinces, ...(draft.province ? [draft.province] : [])])]} value={draft.province || null} onChange={(value) => update("province", value || "")} nothingFoundMessage="Provinsi tidak ditemukan" description={provinceError || undefined} />
      {input("current_school", "Sekolah saat ini", "Nama sekolah")}
      {input("dream_university", "Universitas impian", "Nama universitas")}
      {input("target_major", "Jurusan tujuan", "Jurusan yang dituju")}
    </SimpleGrid></Card>
  </Stack>;
}
