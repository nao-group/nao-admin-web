"use client";
import { useEffect, useState } from "react";
import { Alert, Badge, Button, Group, Modal, SimpleGrid, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconArrowLeft, IconArrowRight, IconUserPlus } from "@tabler/icons-react";
import { DetailItem } from "@/components/ui/admin";
import { getStudentProvinceOptions } from "../../api";
import { blankStudent, FIELD_LABELS } from "../data";
import { validateStudent } from "../parse";
import type { StudentDraft, StudentField } from "../types";
import { PasteStudent } from "./paste-student";
import { StudentFields } from "./student-fields";

export function StudentEntryModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState<StudentDraft>(blankStudent);
  const [errors, setErrors] = useState<Partial<Record<StudentField, string>>>({});
  const [review, setReview] = useState(false);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [provinceError, setProvinceError] = useState("");
  useEffect(() => {
    if (!opened) return;
    const controller = new AbortController();
    getStudentProvinceOptions(controller.signal).then((values) => { if (!controller.signal.aborted) setProvinces(values); })
      .catch(() => { if (!controller.signal.aborted) setProvinceError("Pilihan provinsi belum dapat dimuat. Field opsional ini dapat dilengkapi nanti."); });
    return () => controller.abort();
  }, [opened]);
  const update = (field: StudentField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const preview = () => {
    const validation = validateStudent(draft);
    setErrors(validation);
    if (Object.keys(validation).length) {
      notifications.show({ color: "red", title: "Periksa data murid", message: "Lengkapi field wajib dan perbaiki data yang ditandai." });
      return;
    }
    setDraft((current) => Object.fromEntries(Object.entries(current).map(([key, value]) => [key, value.trim()])) as StudentDraft);
    setReview(true);
  };
  return <Modal opened={opened} onClose={onClose} size={1100} centered title={<Group gap="sm"><Text className="section-title">Tambah murid StudyNao</Text><Badge variant="light" color="blue">Pratinjau</Badge></Group>}>
    <Stack gap="lg">
      <Alert color="blue">Data belum disimpan ke sistem. Form ini dapat digunakan untuk mengisi dan meninjau data murid.</Alert>
      {review ? <>
        <Text fw={700}>Ringkasan data murid</Text>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>{(Object.keys(FIELD_LABELS) as StudentField[]).map((field) => <DetailItem key={field} label={FIELD_LABELS[field]} value={field === "whatsapp" ? `+62${draft.whatsapp}` : draft[field] || "—"} />)}</SimpleGrid>
        <Group justify="space-between"><Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => setReview(false)}>Edit data</Button><Button className="primary-action" onClick={onClose}>Tutup pratinjau</Button></Group>
      </> : <>
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
          <StudentFields draft={draft} errors={errors} update={update} provinces={provinces} provinceError={provinceError} />
          <PasteStudent onApply={(values) => {
            setDraft((current) => ({ ...current, ...values })); setErrors({});
            notifications.show({ color: "teal", title: "Form terisi", message: "Data dari teks sudah diterapkan. Periksa kembali sebelum meninjau." });
          }} />
        </SimpleGrid>
        <Group justify="space-between"><Button variant="subtle" color="gray" onClick={onClose}>Batal</Button><Button className="primary-action" leftSection={<IconUserPlus size={16} />} rightSection={<IconArrowRight size={16} />} onClick={preview}>Tinjau data murid</Button></Group>
      </>}
    </Stack>
  </Modal>;
}
