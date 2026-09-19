"use client";

import Link from "next/link";
import { Tabs } from "@mantine/core";
import { IconListDetails, IconPhoto } from "@tabler/icons-react";

export function QuestionExtractorNav({ active }: { active: "questions" | "gallery" }) {
  return <Tabs value={active} mb="xl">
    <Tabs.List>
      <Tabs.Tab value="questions" renderRoot={(props) => <Link href="/learning/questions" {...props}/>} leftSection={<IconListDetails size={17}/>}>Questions</Tabs.Tab>
      <Tabs.Tab value="gallery" renderRoot={(props) => <Link href="/learning/questions/gallery" {...props}/>} leftSection={<IconPhoto size={17}/>}>Image gallery</Tabs.Tab>
    </Tabs.List>
  </Tabs>;
}
