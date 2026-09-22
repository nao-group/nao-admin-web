"use client";

import { useRef, useState } from "react";
import { Button, Group, Stack, Text } from "@mantine/core";

type Point = { x: number; y: number };
type Box = { x0: number; y0: number; x1: number; y1: number };

export function StagedImageEditor({ url, busy, onCrop }: { url: string; busy: boolean; onCrop: (box: Box) => Promise<void> }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const dragging = useRef(false);
  const [start, setStart] = useState<Point | null>(null);
  const [end, setEnd] = useState<Point | null>(null);
  const point = (event: React.PointerEvent<HTMLImageElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  };
  const box = start && end ? { x0: Math.min(start.x, end.x), y0: Math.min(start.y, end.y),
    x1: Math.max(start.x, end.x), y1: Math.max(start.y, end.y) } : null;
  const canCrop = box && box.x1 - box.x0 > 0.02 && box.y1 - box.y0 > 0.02;
  return <Stack gap="xs">
    <Text size="sm" c="dimmed">Drag a rectangle over the image, then save the crop.</Text>
    <div style={{ position: "relative", width: "fit-content", maxWidth: "100%", touchAction: "none" }}>
      {/* The image itself owns the pointer coordinates, so the selection matches its rendered pixels. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imageRef} src={url} alt="Question figure to crop" draggable={false}
        style={{ display: "block", maxWidth: "100%", maxHeight: 500, cursor: "crosshair" }}
        onPointerDown={(event) => { dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); const next = point(event); setStart(next); setEnd(next); }}
        onPointerMove={(event) => { if (dragging.current) setEnd(point(event)); }}
        onPointerUp={(event) => { dragging.current = false; setEnd(point(event)); }}
        onPointerCancel={() => { dragging.current = false; }} />
      {box && <div style={{ pointerEvents: "none", position: "absolute", left: `${box.x0 * 100}%`, top: `${box.y0 * 100}%`,
        width: `${(box.x1 - box.x0) * 100}%`, height: `${(box.y1 - box.y0) * 100}%`,
        border: "2px solid #d4a017", background: "rgba(212,160,23,.18)" }} />}
    </div>
    <Group><Button size="xs" disabled={!canCrop} loading={busy} onClick={async () => { if (box) { await onCrop(box); setStart(null); setEnd(null); } }}>Simpan crop</Button>
      <Button size="xs" variant="subtle" disabled={!box || busy} onClick={() => { setStart(null); setEnd(null); }}>Clear selection</Button></Group>
  </Stack>;
}
