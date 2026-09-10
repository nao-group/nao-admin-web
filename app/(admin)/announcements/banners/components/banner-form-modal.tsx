"use client";

import { useState } from "react";
import { Alert, Box, Button, FileInput, Group, Image, Modal, Select, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { IconAlertCircle, IconCheck, IconPhoto, IconUpload } from "@tabler/icons-react";
import type { Banner, BannerStatus } from "@/types/admin";

const blankBanner = (): Banner => ({ id: 0, name: "", imageUrl: "", fileName: "", redirectUrl: "", status: "Draft", startsAt: "2026-09-10T08:00", endsAt: "2026-09-30T23:59" });

export function BannerFormModal({ opened, editing, onClose, onSave }: { opened: boolean; editing: Banner | null; onClose: () => void; onSave: (banner: Banner) => void }) {
  const [form, setForm] = useState<Banner>(editing ?? blankBanner());
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [dimensionNote, setDimensionNote] = useState("");
  const update = <K extends keyof Banner>(key: K, value: Banner[K]) => setForm((current) => ({ ...current, [key]: value }));

  function handleFile(nextFile: File | null) {
    setFile(nextFile);
    setError("");
    setDimensionNote("");
    if (!nextFile) return;
    if (!["image/png", "image/jpeg"].includes(nextFile.type)) { setError("Gunakan file PNG atau JPG/JPEG."); return; }
    if (nextFile.size > 5 * 1024 * 1024) { setError("Ukuran file maksimal 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = String(reader.result);
      const image = new window.Image();
      image.onload = () => {
        const ratio = image.width / image.height;
        setDimensionNote(ratio < 2.8 || ratio > 3.8 ? `Rasio gambar ${ratio.toFixed(2)}:1. Untuk hasil terbaik gunakan 1600×480 px (sekitar 3.33:1).` : `${image.width}×${image.height} px · rasio sesuai carousel.`);
      };
      image.src = imageUrl;
      setForm((current) => ({ ...current, imageUrl, fileName: nextFile.name }));
    };
    reader.readAsDataURL(nextFile);
  }

  function submit() {
    if (!form.name.trim()) { setError("Nama internal banner wajib diisi."); return; }
    if (!form.imageUrl) { setError("Upload gambar PNG atau JPG untuk banner ini."); return; }
    if (form.redirectUrl && !/^(https?:\/\/|\/)/.test(form.redirectUrl)) { setError("Redirect URL harus berupa URL lengkap https:// atau path yang diawali /."); return; }
    if (new Date(form.endsAt) <= new Date(form.startsAt)) { setError("Waktu selesai harus setelah waktu mulai."); return; }
    onSave(form);
  }

  return <Modal opened={opened} onClose={onClose} size="xl" centered title={<Text className="section-title">{editing ? "Edit banner" : "Upload new banner"}</Text>}><SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl"><Stack gap="md"><TextInput label="Internal name" description="Hanya terlihat oleh admin" value={form.name} onChange={(event) => update("name", event.currentTarget.value)} required /><FileInput label="Banner image" description="PNG/JPG · maks. 5 MB · rekomendasi 1600×480 px" placeholder="Choose image" accept="image/png,image/jpeg" value={file} onChange={handleFile} leftSection={<IconUpload size={16} />} clearable required={!editing} />{dimensionNote && <Text size="xs" c={dimensionNote.includes("terbaik") ? "yellow.8" : "teal.8"}>{dimensionNote}</Text>}<TextInput label="Redirect URL (optional)" description="Tujuan saat banner diklik" placeholder="https://... atau /mock-exam" value={form.redirectUrl} onChange={(event) => update("redirectUrl", event.currentTarget.value)} /><Select label="Status" value={form.status} onChange={(value) => update("status", (value ?? "Draft") as BannerStatus)} data={["Active", "Scheduled", "Draft", "Expired"]} /><SimpleGrid cols={2}><TextInput label="Show from" type="datetime-local" value={form.startsAt} onChange={(event) => update("startsAt", event.currentTarget.value)} /><TextInput label="Show until" type="datetime-local" value={form.endsAt} onChange={(event) => update("endsAt", event.currentTarget.value)} /></SimpleGrid>{error && <Alert color="red" icon={<IconAlertCircle size={18} />} role="alert">{error}</Alert>}</Stack><Box><Text size="sm" fw={600} mb={7}>Image preview</Text><Box className="upload-preview-frame">{form.imageUrl ? <Image src={form.imageUrl} alt="Uploaded banner preview" fit="cover" h="100%" /> : <Stack align="center" gap={6}><IconPhoto size={30} /><Text size="sm" fw={600}>No image selected</Text><Text size="xs" c="dimmed">Preview mempertahankan rasio carousel</Text></Stack>}</Box>{form.fileName && <Text size="xs" c="dimmed" mt={8}>{form.fileName}</Text>}</Box></SimpleGrid><Group justify="flex-end" mt="xl"><Button variant="subtle" color="gray" onClick={onClose}>Cancel</Button><Button className="primary-action" leftSection={<IconCheck size={16} />} onClick={submit}>Save banner</Button></Group></Modal>;
}
