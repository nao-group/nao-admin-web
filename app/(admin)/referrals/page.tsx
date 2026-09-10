"use client";

import { useState } from "react";
import { ActionIcon, Box, Button, Card, Group, Menu, Modal, Progress, Select, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconEdit, IconMenu2, IconPlus, IconTrash } from "@tabler/icons-react";
import { PageHeader, StatusBadge } from "@/components/ui/admin";
import { formatDate } from "@/lib/format";
import { useAdminStore } from "@/store/admin";
import type { Referral } from "@/types/admin";

const blank = (): Referral => ({ id: 0, code: "", owner: "", discount: 10, uses: 0, limit: 100, status: "Active", expiresAt: "2026-12-31" });

export default function ReferralsPage() {
  const referrals = useAdminStore((state) => state.referrals);
  const save = useAdminStore((state) => state.saveReferral);
  const remove = useAdminStore((state) => state.deleteReferral);
  const [editing, setEditing] = useState<Referral | null | undefined>(undefined);
  const [form, setForm] = useState<Referral>(blank());
  const open = (item?: Referral) => { setForm(item ?? blank()); setEditing(item ?? null); };
  const close = () => setEditing(undefined);
  return <><PageHeader eyebrow="Growth tools" title="Referral codes" description="Buat dan pantau kode referral untuk partner, kampus, dan campaign." action={<Button className="primary-action" leftSection={<IconPlus size={17} />} onClick={() => open()}>New code</Button>} /><SimpleGrid cols={{ base: 1, md: 2, xl: 3 }}>{referrals.map((item) => <Card key={item.id} className="surface-card entity-card referral-card" p="lg"><Group justify="space-between"><Box className="code-pill">{item.code}</Box><Menu position="bottom-end"><Menu.Target><ActionIcon variant="subtle" color="gray" aria-label={`Actions for ${item.code}`}><IconMenu2 size={18} /></ActionIcon></Menu.Target><Menu.Dropdown><Menu.Item leftSection={<IconEdit size={15} />} onClick={() => open(item)}>Edit</Menu.Item><Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={() => { if (window.confirm("Delete this referral code?")) remove(item.id); }}>Delete</Menu.Item></Menu.Dropdown></Menu></Group><Group mt="xl" justify="space-between"><Box><Text size="xs" c="dimmed">Owner</Text><Text size="sm" fw={600}>{item.owner}</Text></Box><Box ta="right"><Text size="xs" c="dimmed">Discount</Text><Text fz={22} fw={700} c="#a77905">{item.discount}%</Text></Box></Group><Box mt="lg"><Group justify="space-between" mb={7}><Text size="xs" c="dimmed">Usage</Text><Text size="xs" fw={600}>{item.uses} / {item.limit}</Text></Group><Progress value={(item.uses / item.limit) * 100} color="yellow" radius="xl" /></Box><Group justify="space-between" mt="lg"><Text size="xs" c="dimmed">Expires {formatDate(item.expiresAt)}</Text><StatusBadge status={item.status} /></Group></Card>)}</SimpleGrid><Modal opened={editing !== undefined} onClose={close} centered title={<Text className="section-title">{editing ? "Edit referral" : "Create referral"}</Text>}><Stack><SimpleGrid cols={2}><TextInput label="Code" value={form.code} onChange={(event) => setForm({ ...form, code: event.currentTarget.value.toUpperCase() })} /><TextInput label="Owner" value={form.owner} onChange={(event) => setForm({ ...form, owner: event.currentTarget.value })} /></SimpleGrid><SimpleGrid cols={2}><TextInput label="Discount (%)" type="number" value={form.discount} onChange={(event) => setForm({ ...form, discount: Number(event.currentTarget.value) })} /><TextInput label="Usage limit" type="number" value={form.limit} onChange={(event) => setForm({ ...form, limit: Number(event.currentTarget.value) })} /></SimpleGrid><SimpleGrid cols={2}><Select label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: (value ?? "Active") as Referral["status"] })} data={["Active", "Paused", "Expired"]} /><TextInput label="Expires" type="date" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.currentTarget.value })} /></SimpleGrid><Group justify="flex-end"><Button variant="subtle" color="gray" onClick={close}>Cancel</Button><Button className="primary-action" leftSection={<IconCheck size={16} />} onClick={() => { save(form); close(); notifications.show({ color: "teal", message: "Referral code saved" }); }}>Save</Button></Group></Stack></Modal></>;
}
