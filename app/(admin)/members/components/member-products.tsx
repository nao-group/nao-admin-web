import { Badge, Group, Text, Tooltip } from "@mantine/core";
import type { MemberProduct } from "../types";

export function MemberProducts({ products, product }: { products?: MemberProduct[]; product: string | null }) {
  const items = products ?? (product ? [{ name: product, status: null }] : []);
  return items.length ? <Group gap={6}>{items.map((item) => <Tooltip key={item.name} label={item.status ? `${item.name} · ${item.status}` : item.name}>
    <Badge variant="outline" color={item.name === "StudyNao" ? "blue" : "dark"}>{item.name}</Badge>
  </Tooltip>)}</Group> : <Text size="xs" c="dimmed">—</Text>;
}
