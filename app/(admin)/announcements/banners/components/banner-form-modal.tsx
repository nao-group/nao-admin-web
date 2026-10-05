"use client";

import { useEffect, useState } from "react";
import { Alert, Box, Button, FileInput, Group, Image, Loader, LoadingOverlay, Modal, Select, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { IconAlertCircle, IconCheck, IconInfoCircle, IconPhoto, IconUpload } from "@tabler/icons-react";
import { BannerApiError } from "../api";
import type { Banner, BannerWritePayload } from "../types";

const REQUIRED_RATIO = 10 / 3;
const RATIO_TOLERANCE = 0.02;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const START_GRACE_MS = 5 * 60 * 1000; // form-open to submit delay
type FormStatus = BannerWritePayload["status"];

const pad = (value: number) => String(value).padStart(2, "0");
const toLocalInput = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
const toPickerValue = (value: string) => `${value.replace("T", " ")}:00`;
const fromPickerValue = (value: string | null) => value ? value.slice(0, 16).replace(" ", "T") : "";
const nowInput = () => toLocalInput(new Date());
const addToInput = (value: string, ms: number) => toLocalInput(new Date(new Date(value).getTime() + ms));
const defaultStart = nowInput;
const defaultEnd = () => toLocalInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve({ width: image.naturalWidth, height: image.naturalHeight }); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("invalid")); };
    image.src = url;
  });
}

export function BannerFormModal({ opened, editing, onClose, onSave }: { opened: boolean; editing: Banner | null; onClose: () => void; onSave: (payload: BannerWritePayload) => Promise<void> }) {
  const wasExpired = editing?.status === "Expired";
  const [name, setName] = useState(editing?.name ?? "");
  const [redirectUrl, setRedirectUrl] = useState(editing?.redirectUrl ?? "");
  const [status, setStatus] = useState<FormStatus>(editing && !wasExpired ? (editing.status as FormStatus) : "Draft");
  const [startsAt, setStartsAt] = useState(editing?.startsAt ? toLocalInput(new Date(editing.startsAt)) : defaultStart());
  const [endsAt, setEndsAt] = useState(editing?.endsAt ? toLocalInput(new Date(editing.endsAt)) : defaultEnd());
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(editing?.imageUrl ?? "");
  const [dimensionNote, setDimensionNote] = useState("");
  const [imageError, setImageError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [startNote, setStartNote] = useState("");
  const [endNote, setEndNote] = useState("");
  const originalStart = editing?.startsAt ? toLocalInput(new Date(editing.startsAt)) : null;

  useEffect(() => () => { if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  async function handleFile(nextFile: File | null) {
    setImageError(""); setDimensionNote("");
    if (!nextFile) { setFile(null); setPreviewUrl(editing?.imageUrl ?? ""); setPreviewLoaded(false); return; }
    setProcessing(true);
    try { await validateFile(nextFile); } finally { setProcessing(false); }
  }

  async function validateFile(nextFile: File) {
    if (!["image/png", "image/jpeg"].includes(nextFile.type)) { setFile(null); setImageError("Gunakan file PNG atau JPG/JPEG."); return; }
    if (nextFile.size > MAX_IMAGE_BYTES) { setFile(null); setImageError("Ukuran file maksimal 5 MB."); return; }
    try {
      const { width, height } = await readImageSize(nextFile);
      if (Math.abs(width / height - REQUIRED_RATIO) > RATIO_TOLERANCE) {
        setFile(null);
        setImageError(`Rasio gambar harus 10:3 (mis. 1600×480 px). Gambar ini ${width}×${height} px (rasio ${(width / height).toFixed(2)}:1).`);
        return;
      }
      setFile(nextFile);
      setPreviewUrl(URL.createObjectURL(nextFile));
      setPreviewLoaded(false);
      setDimensionNote(`${width}×${height} px · rasio 10:3 sesuai.`);
    } catch {
      setFile(null);
      setImageError("File bukan gambar yang valid.");
    }
  }

  function changeStart(value: string) {
    if (!value) return;
    const now = nowInput();
    const next = value < now ? now : value;
    setStartNote(value < now ? "Waktu mulai tidak boleh lebih awal dari sekarang. Disesuaikan ke waktu saat ini." : "");
    setStartsAt(next);
    if (endsAt <= next) { setEndsAt(addToInput(next, 24 * 60 * 60 * 1000)); setEndNote("Waktu selesai disesuaikan agar setelah waktu mulai."); } else setEndNote("");
  }

  function changeEnd(value: string) {
    if (!value) return;
    const floor = startsAt > nowInput() ? startsAt : nowInput();
    if (value <= floor) { setEndsAt(addToInput(floor, 60 * 60 * 1000)); setEndNote("Waktu selesai harus setelah waktu mulai dan waktu sekarang. Disesuaikan otomatis."); return; }
    setEndsAt(value); setEndNote("");
  }

  async function submit() {
    if (!name.trim()) { setError("Nama internal banner wajib diisi."); return; }
    if (!editing && !file) { setError("Upload gambar PNG atau JPG (rasio 10:3) untuk banner ini."); return; }
    if (imageError) { setError(imageError); return; }
    if (redirectUrl.trim() && !/^(https?:\/\/\S+|\/(?!\/)\S*)$/.test(redirectUrl.trim())) { setError("Redirect URL harus berupa URL lengkap https:// atau path yang diawali /."); return; }
    if (status === "Scheduled") {
      if (!startsAt || !endsAt) { setError("Waktu mulai dan selesai wajib diisi untuk banner terjadwal."); return; }
      if (new Date(endsAt) <= new Date(startsAt)) { setError("Waktu selesai harus setelah waktu mulai."); return; }
      if (startsAt !== originalStart && new Date(startsAt).getTime() < Date.now() - START_GRACE_MS) { setError("Waktu mulai tidak boleh lebih awal dari waktu sekarang."); return; }
      if (new Date(endsAt) <= new Date()) { setError("Waktu selesai sudah lewat. Pilih waktu di masa depan."); return; }
    }
    setError(""); setSubmitting(true);
    try {
      await onSave({
        name: name.trim(), redirectUrl: redirectUrl.trim(), status, image: file,
        startsAt: status === "Scheduled" ? new Date(startsAt).toISOString() : null,
        endsAt: status === "Scheduled" ? new Date(endsAt).toISOString() : null,
      });
    } catch (caught) {
      setError(caught instanceof BannerApiError ? caught.message : "Banner gagal disimpan. Silakan coba lagi.");
      setSubmitting(false);
    }
  }

  return <Modal opened={opened} onClose={onClose} size="xl" centered closeOnClickOutside={!submitting} closeOnEscape={!submitting} title={<Text className="section-title">{editing ? "Edit banner" : "Upload banner baru"}</Text>}>
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
      <Stack gap="md">
        <TextInput label="Nama internal" description="Hanya terlihat oleh admin" value={name} onChange={(event) => setName(event.currentTarget.value)} maxLength={200} required />
        <FileInput label="Gambar banner" description="PNG/JPG · maks. 5 MB · wajib rasio 10:3 (mis. 1600×480 px)" placeholder={editing ? "Ganti gambar (opsional)" : "Pilih gambar"} accept="image/png,image/jpeg" value={file} onChange={(next) => void handleFile(next)} leftSection={<IconUpload size={16} />} clearable required={!editing} error={imageError || undefined} disabled={submitting} rightSection={processing ? <Loader size={16} color="yellow" /> : undefined} />
        {dimensionNote && <Text size="xs" c="teal.8">{dimensionNote}</Text>}
        <TextInput label="Redirect URL (opsional)" description="Tujuan saat banner diklik" placeholder="https://... atau /mock-exam" value={redirectUrl} onChange={(event) => setRedirectUrl(event.currentTarget.value)} />
        {wasExpired && <Alert color="gray" icon={<IconInfoCircle size={18} />}>Banner ini sudah kedaluwarsa. Pilih Draft, Scheduled (dengan periode baru), atau Active untuk mengubahnya.</Alert>}
        <Select label="Status" description="Draft: belum tayang · Scheduled: tayang pada periode tertentu · Active: tayang sekarang" value={status} onChange={(value) => setStatus((value ?? "Draft") as FormStatus)} allowDeselect={false} data={["Draft", "Scheduled", "Active"]} />
        {status === "Scheduled" && <SimpleGrid cols={2}>
          <DateTimePicker label="Tampil mulai" description="Tidak boleh sebelum waktu sekarang" minDate={nowInput().slice(0, 10)} error={startNote || undefined} value={toPickerValue(startsAt)} onChange={(value) => changeStart(fromPickerValue(value))} valueFormat="DD MMM YYYY, HH:mm" clearable={false} timePickerProps={{ format: "24h" }} />
          <DateTimePicker label="Tampil sampai" description="Setelah ini banner menjadi Expired" minDate={(startsAt > nowInput() ? startsAt : nowInput()).slice(0, 10)} error={endNote || undefined} value={toPickerValue(endsAt)} onChange={(value) => changeEnd(fromPickerValue(value))} valueFormat="DD MMM YYYY, HH:mm" clearable={false} timePickerProps={{ format: "24h" }} />
        </SimpleGrid>}
        {error && <Alert color="red" icon={<IconAlertCircle size={18} />} role="alert">{error}</Alert>}
      </Stack>
      <Box>
        <Text size="sm" fw={600} mb={7}>Preview gambar</Text>
        <Box className="upload-preview-frame" pos="relative"><LoadingOverlay visible={processing || submitting || (!!previewUrl && !previewLoaded)} zIndex={5} overlayProps={{ radius: "md", blur: 1 }} loaderProps={{ size: "sm", color: "yellow" }} />{previewUrl ? <Image src={previewUrl} alt="Preview banner" fit="cover" h="100%" loading="lazy" onLoad={() => setPreviewLoaded(true)} onError={() => setPreviewLoaded(true)} /> : <Stack align="center" gap={6}><IconPhoto size={30} /><Text size="sm" fw={600}>Belum ada gambar</Text><Text size="xs" c="dimmed">Preview mempertahankan rasio carousel (10:3)</Text></Stack>}</Box>
        {(processing || submitting) && <Text size="xs" c="dimmed" mt={8}>{submitting ? "Mengunggah banner…" : "Memeriksa gambar…"}</Text>}{!processing && !submitting && (file?.name ?? editing?.fileName) && <Text size="xs" c="dimmed" mt={8}>{file?.name ?? editing?.fileName}</Text>}
      </Box>
    </SimpleGrid>
    <Group justify="flex-end" mt="xl"><Button variant="subtle" color="gray" onClick={onClose} disabled={submitting}>Batal</Button><Button className="primary-action" leftSection={<IconCheck size={16} />} onClick={() => void submit()} loading={submitting} disabled={processing}>Simpan banner</Button></Group>
  </Modal>;
}
