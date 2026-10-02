"use client";

import { useState } from "react";
import { Avatar, Center, Image, Modal, UnstyledButton } from "@mantine/core";

export function PhotoPreviewModal({ src, name, opened, onClose }: {
  src: string | null | undefined;
  name: string;
  opened: boolean;
  onClose: () => void;
}) {
  return <Modal opened={opened && Boolean(src)} onClose={onClose} centered size="lg" title={`Foto ${name}`}>
    {src && <Center mih={240} bg="gray.0" p="md" style={{ borderRadius: 12 }}>
      <Image src={src} alt={`Foto ${name}`} fit="contain" style={{ width: "auto", maxWidth: "100%", maxHeight: "70vh" }} />
    </Center>}
  </Modal>;
}

export function PreviewableAvatar({ src, name, fallback, size }: {
  src: string | null | undefined;
  name: string;
  fallback: string;
  size: number;
}) {
  const [opened, setOpened] = useState(false);
  const avatar = <Avatar src={src || undefined} size={size} color="yellow" radius="xl">{fallback}</Avatar>;

  return <>
    {src ? <UnstyledButton type="button" className="photo-preview-trigger" aria-label={`Lihat foto ${name}`} title={`Lihat foto ${name}`} onClick={(event) => { event.stopPropagation(); setOpened(true); }} onKeyDown={(event) => event.stopPropagation()}>{avatar}</UnstyledButton> : avatar}
    <PhotoPreviewModal src={src} name={name} opened={opened} onClose={() => setOpened(false)} />
  </>;
}
