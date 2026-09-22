"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActionIcon, Alert, Badge, Box, Button, Card, Center, Divider, Group, Image, Loader, Modal, Pagination, Select, SimpleGrid, Stack, Text, TextInput, ThemeIcon, Title, UnstyledButton } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconCopy, IconEdit, IconLock, IconPhoto, IconRefresh, IconSearch, IconTrash } from "@tabler/icons-react";
import { PageHeader } from "@/components/ui/admin";
import { cropStagedImage, deleteStagedImage, getGallery, replaceStagedImage } from "../api";
import { QuestionExtractorNav } from "../question-extractor-nav";
import { StagedImageEditor } from "../staged-image-editor";
import type { GalleryImage, PageResult } from "../types";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "ready", label: "Ready" },
  { value: "hold", label: "Hold" },
  { value: "error", label: "Error" },
  { value: "processing", label: "Processing" },
  { value: "synced", label: "Synced" },
];

function statusColor(status: string): string {
  if (status === "synced") return "teal";
  if (status === "ready") return "blue";
  if (status === "hold") return "orange";
  if (status === "error") return "red";
  return "yellow";
}

export default function QuestionImageGalleryPage() {
  const [gallery, setGallery] = useState<PageResult<GalleryImage>>({ items: [], total: 0, page: 1, page_size: 24 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<GalleryImage | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const replaceImageRef = useRef<HTMLInputElement>(null);

  const loadGallery = useCallback(async () => {
    const data = await getGallery(page, search, status);
    setGallery(data);
    setSelected((current) => current ? data.items.find((item) => item.id === current.id) ?? null : null);
    return data;
  }, [page, search, status]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void loadGallery()
        .catch((error) => { if (active) notifications.show({ color: "red", title: "Could not load image gallery", message: error instanceof Error ? error.message : "Try again." }); })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [loadGallery]);

  useEffect(() => {
    const timer = window.setInterval(() => void loadGallery().catch(() => undefined), 12000);
    return () => window.clearInterval(timer);
  }, [loadGallery]);

  const mutateImage = async (action: () => Promise<{ image_url: string | null }>, successMessage: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await action();
      if (result.image_url) setSelected((current) => current ? { ...current, image_url: result.image_url! } : current);
      notifications.show({ color: "teal", message: successMessage });
      await loadGallery();
    } catch (error) {
      notifications.show({ color: "red", title: "Image update failed", message: error instanceof Error ? error.message : "Try again." });
      await loadGallery().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const replaceImage = async (file: File) => {
    if (!selected) return;
    await mutateImage(() => replaceStagedImage(selected.job_id, selected.id, file), "Image replaced.");
  };

  const cropImage = async (box: { x0: number; y0: number; x1: number; y1: number }) => {
    if (!selected) return;
    await mutateImage(() => cropStagedImage(selected.job_id, selected.id, box), "Crop saved.");
  };

  const removeImage = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await deleteStagedImage(selected.job_id, selected.id);
      notifications.show({ color: "teal", message: "Image removed from the draft." });
      setConfirmRemove(false);
      setSelected(null);
      const data = await loadGallery();
      if (data.items.length === 0 && page > 1) setPage((current) => current - 1);
    } catch (error) {
      notifications.show({ color: "red", title: "Could not remove image", message: error instanceof Error ? error.message : "Try again." });
      setConfirmRemove(false);
      await loadGallery().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(gallery.total / gallery.page_size));

  return <>
    <PageHeader eyebrow="Tools pembelajaran" title="Galeri gambar soal" description="Tinjau seluruh gambar hasil ekstraksi, lalu crop atau ganti gambar selama soal masih dalam tahap review." />
    <QuestionExtractorNav active="gallery" />

    <Card className="surface-card" p={0}>
      <Group justify="space-between" align="flex-end" p="lg" gap="md">
        <Box>
          <Title order={2} className="section-title">Gambar hasil ekstraksi</Title>
          <Text size="sm" c="dimmed" mt={4}>Gambar soal yang sudah synced tetap dapat dilihat dan disalin, tetapi tidak dapat diedit.</Text>
        </Box>
        <Group align="flex-end" gap="sm" className="gallery-filter-group">
          <TextInput label="Cari gambar" placeholder="Kode soal…" leftSection={<IconSearch size={16}/>} value={search}
            onChange={(event) => { setSearch(event.currentTarget.value); setPage(1); }} />
          <Select label="Status" data={STATUS_OPTIONS} value={status} allowDeselect={false}
            onChange={(value) => { setStatus(value ?? "all"); setPage(1); }} />
          <ActionIcon variant="light" color="dark" size={36} aria-label="Muat ulang galeri" title="Muat ulang galeri"
            onClick={() => { setLoading(true); void loadGallery().catch((error) => notifications.show({ color: "red", message: error instanceof Error ? error.message : "Coba lagi." })).finally(() => setLoading(false)); }}>
            <IconRefresh size={18}/>
          </ActionIcon>
        </Group>
      </Group>
      <Divider/>

      {loading ? <Center mih={360}><Loader color="yellow"/></Center> : gallery.items.length ? <>
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3, xl: 4 }} spacing="lg" p="lg">
          {gallery.items.map((item) => <UnstyledButton key={`${item.status}-${item.id}`} className="question-gallery-card" onClick={() => setSelected(item)} aria-label={`${item.editable ? "Edit" : "Preview"} image for ${item.code}`}>
            <Box className="question-gallery-image-wrap">
              <Image src={item.image_url} alt={`Extracted figure for ${item.code}`} h={190} fit="contain" loading="lazy"/>
              <span className="question-gallery-action">{item.editable ? <><IconEdit size={15}/> Edit</> : <><IconLock size={14}/> View</>}</span>
            </Box>
            <Stack gap={7} p="md">
              <Group justify="space-between" gap="xs" wrap="nowrap"><Text fw={800} ff="monospace" size="sm" truncate>{item.code}</Text><Badge color={statusColor(item.status)} variant="light" size="sm">{item.status}</Badge></Group>
              <Group gap={6} wrap="nowrap"><Badge color="gray" variant="outline" size="xs">{item.subject ?? "—"}</Badge><Text size="xs" c="dimmed" truncate>{item.source_file_name || "Extracted question image"}</Text></Group>
            </Stack>
          </UnstyledButton>)}
        </SimpleGrid>
        <Group className="pagination-bar" justify="space-between" p="md">
          <Text size="sm" c="dimmed">Menampilkan {(page - 1) * gallery.page_size + 1}–{Math.min(page * gallery.page_size, gallery.total)} dari {gallery.total} gambar</Text>
          <Pagination total={totalPages} value={page} onChange={setPage} color="dark" />
        </Group>
      </> : <Center mih={360}><Stack align="center" gap="xs"><ThemeIcon size={52} radius="xl" color="gray" variant="light"><IconPhoto size={25}/></ThemeIcon><Text fw={700}>{search || status !== "all" ? "Tidak ada gambar yang sesuai filter" : "Belum ada gambar hasil ekstraksi"}</Text><Text size="sm" c="dimmed">{search || status !== "all" ? "Hapus pencarian atau pilih status lain." : "Gambar akan muncul setelah proses ekstraksi soal selesai."}</Text></Stack></Center>}
    </Card>

    <Modal opened={Boolean(selected)} onClose={() => !busy && setSelected(null)} title={selected ? `${selected.editable ? "Edit gambar" : "Preview gambar"} · ${selected.code}` : "Preview gambar"} size="xl" centered closeOnClickOutside={!busy}>
      {selected && <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <Box><Group gap="xs"><Badge color={statusColor(selected.status)} variant="light">{selected.status}</Badge>{selected.subject && <Badge color="gray" variant="outline">{selected.subject}</Badge>}</Group><Text size="sm" c="dimmed" mt={7}>{selected.source_file_name || "Extracted question image"}</Text></Box>
          <ActionIcon variant="light" color="dark" aria-label="Copy image link" title="Copy image link" onClick={() => void navigator.clipboard.writeText(selected.image_url).then(() => notifications.show({ color: "teal", message: "Image link copied." }))}><IconCopy size={17}/></ActionIcon>
        </Group>

        {selected.editable
          ? <StagedImageEditor key={selected.image_url} url={selected.image_url} busy={busy} onCrop={cropImage}/>
          : <><Image src={selected.image_url} alt={`Extracted figure for ${selected.code}`} fit="contain" mah="65vh" radius="md" className="question-gallery-modal-image"/><Alert color={selected.status === "synced" ? "teal" : "yellow"} variant="light" icon={selected.status === "synced" ? <IconLock size={18}/> : <IconAlertCircle size={18}/>} title={selected.status === "synced" ? "Synced question" : "Image editing unavailable"}>{selected.status === "synced" ? "This image has been published to the question bank and is read-only." : "Wait until extraction finishes before editing this image."}</Alert></>}

        {selected.editable && <><Divider/><input ref={replaceImageRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void replaceImage(file); }}/><Group justify="space-between" gap="sm"><Group gap="xs"><Button variant="light" disabled={busy} leftSection={<IconPhoto size={17}/>} onClick={() => replaceImageRef.current?.click()}>Ganti gambar</Button><Button variant="subtle" disabled={busy} leftSection={<IconCopy size={16}/>} onClick={() => void navigator.clipboard.writeText(selected.image_url).then(() => notifications.show({ color: "teal", message: "Link gambar disalin." }))}>Salin link</Button></Group><Button variant="light" color="red" disabled={busy} leftSection={<IconTrash size={16}/>} onClick={() => setConfirmRemove(true)}>Hapus gambar</Button></Group></>}
      </Stack>}
    </Modal>

    <Modal opened={confirmRemove} onClose={() => !busy && setConfirmRemove(false)} withCloseButton={!busy} size="sm" centered title={null} closeOnClickOutside={!busy} closeOnEscape={!busy}>
      <Stack gap="lg" pt="sm"><Group align="flex-start" wrap="nowrap" gap="md"><ThemeIcon size={46} radius="xl" color="red" variant="light"><IconPhoto size={23}/></ThemeIcon><Box flex={1}><Title order={3}>Hapus gambar soal?</Title><Text size="sm" c="dimmed" mt={6}>Gambar saat ini untuk {selected?.code} akan dihapus dari draft dan tidak lagi muncul di galeri.</Text></Box></Group><Alert color="red" variant="light" icon={<IconAlertCircle size={18}/>}>Tindakan ini tidak dapat dibatalkan. Gambar lain dapat di-upload kembali dari detail soal.</Alert><Group justify="flex-end"><Button variant="subtle" color="gray" disabled={busy} onClick={() => setConfirmRemove(false)}>Batal</Button><Button color="red" loading={busy} leftSection={<IconTrash size={16}/>} onClick={() => void removeImage()}>Hapus gambar</Button></Group></Stack>
    </Modal>
  </>;
}
