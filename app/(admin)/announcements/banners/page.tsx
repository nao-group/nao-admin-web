"use client";

import { useState } from "react";
import { ActionIcon, Badge, Box, Button, Card, Group, Image, Menu, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconChevronDown, IconChevronUp, IconEdit, IconExternalLink, IconGripVertical, IconMenu2, IconPhoto, IconPlus, IconTrash } from "@tabler/icons-react";
import { PageHeader, StatusBadge } from "@/components/ui/admin";
import { formatDate } from "@/lib/format";
import { useAdminStore } from "@/store/admin";
import type { Banner } from "@/types/admin";
import { BannerCarouselPreview } from "./components/banner-carousel-preview";
import { BannerFormModal } from "./components/banner-form-modal";

export default function BannersPage() {
  const banners = useAdminStore((state) => state.banners);
  const saveBanner = useAdminStore((state) => state.saveBanner);
  const deleteBanner = useAdminStore((state) => state.deleteBanner);
  const reorderBanners = useAdminStore((state) => state.reorderBanners);
  const [modal, setModal] = useState<{ editing: Banner | null } | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  function remove(id: number) {
    if (!window.confirm("Delete this banner?")) return;
    deleteBanner(id);
    notifications.show({ color: "red", title: "Banner deleted", message: "Banner dihapus dari carousel admin." });
  }

  function moveBanner(id: number, direction: -1 | 1) {
    const index = banners.findIndex((banner) => banner.id === id);
    const target = banners[index + direction];
    if (target) reorderBanners(id, target.id);
  }

  function resetDrag() {
    setDraggedId(null);
    setDragOverId(null);
  }

  return <>
    <PageHeader eyebrow="Content management" title="Announcement banners" description="Upload banner yang akan tampil langsung di carousel dashboard ThinkNAO." action={<Button className="primary-action" leftSection={<IconPlus size={17} />} onClick={() => setModal({ editing: null })}>Upload banner</Button>} />
    <Card className="surface-card" p="lg" mb="lg">
      <Group justify="space-between" mb="lg">
        <Box><Text className="section-title">Carousel preview</Text><Text size="xs" c="dimmed" mt={3}>Rasio dan urutan mengikuti area announcement di ThinkNAO.</Text></Box>
        <Badge variant="light" color="yellow">{banners.length} banners</Badge>
      </Group>
      <BannerCarouselPreview banners={banners} />
    </Card>

    <Group justify="space-between" mb="md">
      <Box><Text className="section-title">Banner library</Text><Text size="xs" c="dimmed">Drag handle untuk mengubah urutan carousel. Tombol panah juga tersedia.</Text></Box>
    </Group>
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
          if (sourceId && sourceId !== banner.id) reorderBanners(sourceId, banner.id);
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
              <Text size="xs" fw={600}>Drag to reorder</Text>
            </UnstyledButton>
            <Group gap={4} wrap="nowrap">
              <ActionIcon variant="subtle" color="gray" disabled={index === 0} onClick={() => moveBanner(banner.id, -1)} aria-label={`Move ${banner.name} up`}><IconChevronUp size={16} /></ActionIcon>
              <ActionIcon variant="subtle" color="gray" disabled={index === banners.length - 1} onClick={() => moveBanner(banner.id, 1)} aria-label={`Move ${banner.name} down`}><IconChevronDown size={16} /></ActionIcon>
            </Group>
          </Group>
          <Box className="banner-thumb">{banner.imageUrl ? <Image src={banner.imageUrl} alt={banner.name} fit="cover" h="100%" /> : <Stack align="center" gap={4}><IconPhoto size={25} /><Text size="xs">Image pending</Text></Stack>}</Box>
          <Box p="lg">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Box className="banner-card-copy"><Text fw={700}>{banner.name}</Text><Text size="xs" c="dimmed" mt={3}>{banner.fileName}</Text></Box>
              <Menu position="bottom-end"><Menu.Target><ActionIcon variant="subtle" color="gray" aria-label={`Actions for ${banner.name}`}><IconMenu2 size={18} /></ActionIcon></Menu.Target><Menu.Dropdown><Menu.Item leftSection={<IconEdit size={15} />} onClick={() => setModal({ editing: banner })}>Edit</Menu.Item><Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={() => remove(banner.id)}>Delete</Menu.Item></Menu.Dropdown></Menu>
            </Group>
            <Group mt="lg" justify="space-between"><StatusBadge status={banner.status} />{banner.redirectUrl ? <Group gap={4} wrap="nowrap" className="banner-redirect-value"><IconExternalLink size={13} /><Text size="xs" c="dimmed" lineClamp={1}>{banner.redirectUrl}</Text></Group> : <Text size="xs" c="dimmed">No redirect</Text>}</Group>
            <Box className="schedule-block" mt="md"><Text size="xs" c="dimmed">Scheduled visibility</Text><Text size="sm" fw={600}>{formatDate(banner.startsAt)} — {formatDate(banner.endsAt)}</Text></Box>
          </Box>
        </Card>
      </Box>)}
    </SimpleGrid>
    {modal && <BannerFormModal key={modal.editing?.id ?? "new"} opened editing={modal.editing} onClose={() => setModal(null)} onSave={(banner) => { saveBanner(banner); setModal(null); notifications.show({ color: "teal", title: "Banner saved", message: "Preview carousel sudah diperbarui." }); }} />}
  </>;
}
