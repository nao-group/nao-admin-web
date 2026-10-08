"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionIcon, Badge, Box, Group, Indicator, Loader, Menu, Stack, Text } from "@mantine/core";
import { IconBell, IconCalendarEvent, IconReceipt, IconSchool } from "@tabler/icons-react";
import { ADMIN_NOTIFICATIONS_REFRESH } from "@/lib/teacher-approvals";
import { listAdminNotifications, type AdminNotification } from "@/lib/admin-notifications";

export function AdminNotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try { setItems(await listAdminNotifications()); }
    catch { /* The rest of the admin header remains usable when notifications fail. */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
    const onFocus = () => { void load(); };
    const onVisible = () => { if (document.visibilityState === "visible") void load(); };
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 60_000);
    window.addEventListener("focus", onFocus);
    window.addEventListener(ADMIN_NOTIFICATIONS_REFRESH, onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", onFocus); window.removeEventListener(ADMIN_NOTIFICATIONS_REFRESH, onFocus); document.removeEventListener("visibilitychange", onVisible); };
  }, [load]);

  return <Menu position="bottom-end" width={340} shadow="md" withinPortal>
    <Menu.Target><Indicator inline label={items.length > 99 ? "99+" : items.length} size={18} disabled={!items.length} color="red" offset={3}>
      <ActionIcon variant="subtle" color="dark" size="lg" aria-label={`Notifikasi${items.length ? `, ${items.length} perlu ditindaklanjuti` : ""}`}><IconBell size={21} stroke={1.8} /></ActionIcon>
    </Indicator></Menu.Target>
    <Menu.Dropdown>
      <Group justify="space-between" px="sm" py="xs"><Text fw={700} size="sm">Notifikasi</Text><Badge variant="light" color="yellow">{items.length} menunggu</Badge></Group>
      <Menu.Divider />
      {loading ? <Group justify="center" py="md"><Loader size="sm" /></Group> : items.length === 0 ? <Text size="sm" c="dimmed" ta="center" py="md">Tidak ada notifikasi yang perlu ditindaklanjuti.</Text> : <Box mah={340} style={{ overflowY: "auto" }}><Stack gap={0}>{items.map((item) => <Menu.Item key={item.id} leftSection={item.kind === "scheduling" ? <IconCalendarEvent size={18} /> : item.kind === "reimbursement" ? <IconReceipt size={18} /> : <IconSchool size={18} />} onClick={() => router.push(item.href)}><Text size="sm" fw={600}>{item.title}</Text><Text size="xs" c="dimmed" lineClamp={2}>{item.description}</Text></Menu.Item>)}</Stack></Box>}
    </Menu.Dropdown>
  </Menu>;
}
