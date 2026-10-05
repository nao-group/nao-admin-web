"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ActionIcon, Alert, Badge, Box, Button, Card, Center, Group, Image, Loader, Menu, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconChevronDown, IconChevronUp, IconEdit, IconExternalLink, IconGripVertical, IconMenu2, IconPhoto, IconPlus, IconTrash } from "@tabler/icons-react";
import { PageHeader, StatusBadge } from "@/components/ui/admin";
import { BannerApiError, createBanner, deleteBanner, listBanners, reorderBanners, updateBanner } from "./api";
import { BannerCarouselPreview } from "./components/banner-carousel-preview";
import { BannerFormModal } from "./components/banner-form-modal";
import type { Banner, BannerWritePayload } from "./types";

const formatDateTime = (value: string | null) => value ? new Date(value).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const errorMessage = (error: unknown) => error instanceof BannerApiError ? error.message : "Terjadi kesalahan. Silakan coba lagi.";

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modal, setModal] = useState<{ editing: Banner | null } | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const reordering = useRef(false);
  const liveBanners = useMemo(() => banners.filter((banner) => banner.isLive), [banners]);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    listBanners()
      .then((rows) => { if (active) { setBanners(rows); setLoadError(""); } })
      .catch((error) => { if (active) setLoadError(errorMessage(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);

  function retry() {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }

  async function save(payload: BannerWritePayload) {
    const saved = modal?.editing ? await updateBanner(modal.editing.id, payload) : await createBanner(payload);
    // Re-read so order, live state and any server-side expiry are all authoritative.
    setBanners(await listBanners().catch(() => modal?.editing ? banners.map((row) => row.id === saved.id ? saved : row) : [...banners, saved]));
    setModal(null);
    notifications.show({ color: "teal", title: "Banner disimpan", message: "Preview banner sudah diperbarui." });
  }

  async function remove(banner: Banner) {
    if (!window.confirm(`Hapus banner "${banner.name}"?`)) return;
    try {
      await deleteBanner(banner.id);
      setBanners((current) => current.filter((row) => row.id !== banner.id));
      notifications.show({ color: "red", title: "Banner dihapus", message: "Banner dihapus dari koleksi." });
    } catch (error) {
      notifications.show({ color: "red", title: "Gagal menghapus banner", message: errorMessage(error) });
    }
  }

  async function reorder(sourceId: number, targetId: number) {
    if (reordering.current || sourceId === targetId) return;
    const from = banners.findIndex((banner) => banner.id === sourceId);
    const to = banners.findIndex((banner) => banner.id === targetId);
    if (from < 0 || to < 0) return;
    const previous = banners;
    const next = [...banners];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setBanners(next);
    reordering.current = true;
    try {
      setBanners(await reorderBanners(next.map((banner) => banner.id)));
    } catch (error) {
      setBanners(previous);
      notifications.show({ color: "red", title: "Urutan gagal disimpan", message: errorMessage(error) });
    } finally {
      reordering.current = false;
    }
  }

  function moveBanner(id: number, direction: -1 | 1) {
    const target = banners[banners.findIndex((banner) => banner.id === id) + direction];
    if (target) void reorder(id, target.id);
  }

  function resetDrag() {
    setDraggedId(null);
    setDragOverId(null);
  }

  return <>
    <PageHeader eyebrow="Manajemen konten" title="Banner pengumuman" description="Upload banner yang akan tampil langsung di carousel dashboard ThinkNAO." action={<Button className="primary-action" leftSection={<IconPlus size={17} />} onClick={() => setModal({ editing: null })}>Upload banner</Button>} />
    {loadError && <Alert color="red" icon={<IconAlertCircle size={18} />} mb="lg" role="alert" title="Banner gagal dimuat"><Group justify="space-between">{loadError}<Button size="xs" variant="light" color="red" onClick={retry}>Coba lagi</Button></Group></Alert>}
    <Card className="surface-card" p="lg" mb="lg">
      <Group justify="space-between" mb="lg">
        <Box><Text className="section-title">Banner Preview</Text><Text size="xs" c="dimmed" mt={3}>Banner yang sedang tayang, sesuai tampilan dan urutan di dashboard ThinkNAO.</Text></Box>
        <Badge variant="light" color="yellow">{liveBanners.length} tayang</Badge>
      </Group>
      {loading ? <Center mih={220}><Loader size="sm" color="yellow" /></Center> : <BannerCarouselPreview banners={liveBanners} />}
    </Card>

    <Group justify="space-between" mb="md">
      <Box><Text className="section-title">Banner Collection</Text><Text size="xs" c="dimmed">Tarik handle untuk mengubah urutan carousel. Tombol panah juga tersedia.</Text></Box>
      <Badge variant="light" color="gray">{banners.length} banner</Badge>
    </Group>
    {!loading && !banners.length && !loadError && <Box className="banner-empty"><Stack align="center" gap={4}><IconPhoto size={28} /><Text fw={600}>Belum ada banner</Text><Text size="sm" c="dimmed">Klik &ldquo;Upload banner&rdquo; untuk menambahkan banner pertama.</Text></Stack></Box>}
    <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }}>
      {banners.map((banner, index) => <Box
        key={banner.id}
        className="banner-sort-item"
        data-dragging={draggedId === banner.id || undefined}
        data-drag-over={dragOverId === banner.id && draggedId !== banner.id || undefined}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          if (draggedId !== banner.id) setDragOverId(banner.id);
        }}
        onDrop={(event) => {
          event.preventDefault();
          const sourceId = draggedId ?? Number(event.dataTransfer.getData("text/plain"));
          if (sourceId) void reorder(sourceId, banner.id);
          resetDrag();
        }}
      >
        <Card className="surface-card banner-library-card" p={0}>
          <Group className="banner-sort-bar" justify="space-between" wrap="nowrap">
            <UnstyledButton
              className="banner-drag-handle"
              draggable
              aria-label={`Drag ${banner.name} to reorder. Position ${index + 1} of ${banners.length}`}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(banner.id));
                setDraggedId(banner.id);
              }}
              onDragEnd={resetDrag}
              onKeyDown={(event) => {
                if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); moveBanner(banner.id, -1); }
                if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); moveBanner(banner.id, 1); }
              }}
            >
              <IconGripVertical size={18} aria-hidden="true" />
              <Text size="xs" fw={600}>Tarik untuk mengurutkan</Text>
            </UnstyledButton>
            <Group gap={4} wrap="nowrap">
              <ActionIcon variant="subtle" color="gray" disabled={index === 0} onClick={() => moveBanner(banner.id, -1)} aria-label={`Move ${banner.name} up`}><IconChevronUp size={16} /></ActionIcon>
              <ActionIcon variant="subtle" color="gray" disabled={index === banners.length - 1} onClick={() => moveBanner(banner.id, 1)} aria-label={`Move ${banner.name} down`}><IconChevronDown size={16} /></ActionIcon>
            </Group>
          </Group>
          <Box className="banner-thumb">{banner.imageUrl ? <Image src={banner.imageUrl} alt={banner.name} fit="cover" h="100%" loading="lazy" decoding="async" /> : <Stack align="center" gap={4}><IconPhoto size={25} /><Text size="xs">Gambar belum tersedia</Text></Stack>}</Box>
          <Box p="lg">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Box className="banner-card-copy"><Text fw={700}>{banner.name}</Text><Text size="xs" c="dimmed" mt={3}>{banner.fileName}</Text></Box>
              <Menu position="bottom-end"><Menu.Target><ActionIcon variant="subtle" color="gray" aria-label={`Aksi ${banner.name}`}><IconMenu2 size={18} /></ActionIcon></Menu.Target><Menu.Dropdown><Menu.Item leftSection={<IconEdit size={15} />} onClick={() => setModal({ editing: banner })}>Edit</Menu.Item><Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={() => void remove(banner)}>Hapus</Menu.Item></Menu.Dropdown></Menu>
            </Group>
            <Group mt="lg" justify="space-between"><StatusBadge status={banner.status} />{banner.redirectUrl ? <Group gap={4} wrap="nowrap" className="banner-redirect-value"><IconExternalLink size={13} /><Text size="xs" c="dimmed" lineClamp={1}>{banner.redirectUrl}</Text></Group> : <Text size="xs" c="dimmed">Tanpa redirect</Text>}</Group>
            {(banner.status === "Scheduled" || banner.status === "Expired") && <Box className="schedule-block" mt="md"><Text size="xs" c="dimmed">{banner.status === "Expired" ? "Jadwal tampil (berakhir)" : banner.isLive ? "Jadwal tampil · sedang tayang" : "Jadwal tampil · menunggu jadwal"}</Text><Text size="sm" fw={600}>{formatDateTime(banner.startsAt)} — {formatDateTime(banner.endsAt)}</Text></Box>}
          </Box>
        </Card>
      </Box>)}
    </SimpleGrid>
    {modal && <BannerFormModal key={modal.editing?.id ?? "new"} opened editing={modal.editing} onClose={() => setModal(null)} onSave={save} />}
  </>;
}
