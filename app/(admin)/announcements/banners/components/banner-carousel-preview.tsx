"use client";

import { useState } from "react";
import Image from "next/image";
import { ActionIcon, Box, Group, Text, UnstyledButton } from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconExternalLink, IconPhoto } from "@tabler/icons-react";
import type { Banner } from "@/types/admin";

export function BannerCarouselPreview({ banners }: { banners: Banner[] }) {
  const [current, setCurrent] = useState(0);
  const safeCurrent = Math.min(current, Math.max(0, banners.length - 1));
  const previous = () => setCurrent((value) => (value - 1 + banners.length) % banners.length);
  const next = () => setCurrent((value) => (value + 1) % banners.length);

  if (!banners.length) return <Box className="banner-empty"><IconPhoto size={28} /><Text fw={600}>Belum ada banner</Text><Text size="sm" c="dimmed">Upload banner pertama untuk melihat preview carousel.</Text></Box>;

  return <Box className="banner-preview-shell"><Box className="banner-preview-viewport"><Box className="banner-preview-track" style={{ transform: `translateX(calc(${-safeCurrent} * (82% + 16px)))` }}>{banners.map((banner) => {
    const content = banner.imageUrl ? <Image src={banner.imageUrl} alt={`Preview ${banner.name}`} className="banner-preview-image" fill unoptimized sizes="(max-width: 767px) 90vw, 72vw" /> : <Box className="banner-placeholder"><IconPhoto size={30} /><Text className="banner-placeholder-title">{banner.name}</Text><Text size="sm">Upload image to replace this placeholder</Text></Box>;
    return banner.redirectUrl ? <a key={banner.id} className="banner-preview-slide" href={banner.redirectUrl} target="_blank" rel="noreferrer" aria-label={`${banner.name}, open redirect URL`}>{content}<Box className="banner-redirect-chip"><IconExternalLink size={13} />Redirect enabled</Box></a> : <Box key={banner.id} className="banner-preview-slide">{content}</Box>;
  })}</Box><Box className="banner-preview-fade" /></Box><Group className="carousel-controls" justify="space-between"><Box><Text size="xs" c="dimmed">Preview di dashboard ThinkNAO</Text><Text size="sm" fw={600}>{banners[safeCurrent].name}</Text></Box><Group className="carousel-pagination" gap={8} wrap="nowrap"><ActionIcon className="carousel-control" variant="default" onClick={previous} aria-label="Previous banner"><IconChevronLeft size={16} /></ActionIcon>{banners.map((banner, index) => <UnstyledButton key={banner.id} className="carousel-page" data-active={index === safeCurrent || undefined} onClick={() => setCurrent(index)} aria-label={`Show banner ${index + 1}`} aria-current={index === safeCurrent ? "page" : undefined}>{index + 1}</UnstyledButton>)}<ActionIcon className="carousel-control" variant="default" onClick={next} aria-label="Next banner"><IconChevronRight size={16} /></ActionIcon></Group></Group></Box>;
}
