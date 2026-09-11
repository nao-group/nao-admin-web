"use client";

import { Card, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconFileUpload, IconPresentation } from "@tabler/icons-react";
import { PageHeader } from "@/components/ui/admin";

const UPCOMING_TOOLS = [
  {
    title: "Question extraction & upload",
    description: "Ekstrak dan unggah bank soal untuk materi pembelajaran NAO.",
    icon: IconFileUpload,
  },
  {
    title: "PPT generator",
    description: "Generate presentasi pembelajaran dari konten yang sudah disiapkan.",
    icon: IconPresentation,
  },
];

export default function LearningPage() {
  return <><PageHeader eyebrow="Learning tools" title="Learning workspace" description="Area kerja untuk pembuatan dan pengelolaan konten pembelajaran." /><SimpleGrid cols={{ base: 1, sm: 2 }}>{UPCOMING_TOOLS.map((tool) => { const Icon = tool.icon; return <Card key={tool.title} className="surface-card" p="xl"><Stack gap="md"><ThemeIcon size={44} radius="md" color="yellow" variant="light"><Icon size={22} /></ThemeIcon><div><Text fw={700}>{tool.title}</Text><Text size="sm" c="dimmed" mt={5}>{tool.description}</Text></div><Text size="xs" fw={700} c="yellow.8" tt="uppercase" lts=".08em">Coming soon</Text></Stack></Card>; })}</SimpleGrid></>;
}
