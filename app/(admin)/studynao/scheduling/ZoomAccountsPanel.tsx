"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Group, Loader, PasswordInput, Stack, Switch, Text, TextInput, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPlus } from "@tabler/icons-react";

type ZoomAccount = { id: number; name: string; email: string; password?: string; active: boolean };

async function zoomApi<T>(path = "", init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin/studynao/scheduling/zoom-accounts${path}`, { ...init, cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail ?? "Akun Zoom belum dapat dikelola.");
  return body as T;
}

export function ZoomAccountsPanel() {
  const [accounts, setAccounts] = useState<ZoomAccount[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    zoomApi<{ items: ZoomAccount[] }>().then((result) => { if (active) setAccounts(result.items); })
      .catch((error) => { if (active) notifications.show({ color: "red", message: error instanceof Error ? error.message : "Akun Zoom belum dapat dimuat." }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function addAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const account = await zoomApi<ZoomAccount>("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      setAccounts((items) => [...items, account].sort((a, b) => a.name.localeCompare(b.name)));
      setName(""); setEmail(""); setPassword("");
      notifications.show({ color: "teal", message: "Akun Zoom ditambahkan ke kapasitas penjadwalan." });
    } catch (error) { notifications.show({ color: "red", message: error instanceof Error ? error.message : "Akun Zoom belum dapat ditambahkan." }); }
    finally { setBusy(false); }
  }

  async function setActive(account: ZoomAccount, active: boolean) {
    setBusy(true);
    try {
      const updated = await zoomApi<ZoomAccount>(`/${account.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
      setAccounts((items) => items.map((item) => item.id === updated.id ? updated : item));
      notifications.show({ color: "teal", message: `${account.name} sekarang ${active ? "aktif" : "nonaktif"}.` });
    } catch (error) { notifications.show({ color: "red", message: error instanceof Error ? error.message : "Status akun belum dapat diubah." }); }
    finally { setBusy(false); }
  }

  const activeCount = accounts.filter((account) => account.active).length;
  return <Stack gap="lg">
    <Card withBorder radius="lg" p="lg"><Stack gap="md"><Group justify="space-between"><div><Title order={2} size="h3">Akun Zoom</Title><Text size="sm" c="dimmed">Setiap akun aktif dapat menjadi host satu kelas StudyNao dalam satu waktu. Sesi yang sudah ada dihitung dalam kapasitas.</Text></div><Badge color={activeCount ? "teal" : "red"} variant="light">{activeCount} aktif</Badge></Group>
      <form onSubmit={(event) => void addAccount(event)}><Group align="end" gap="sm"><TextInput label="Nama akun" placeholder="StudyNao Zoom 1" value={name} onChange={(event) => setName(event.currentTarget.value)} required minLength={2} style={{ flex: 1, minWidth: 180 }} /><TextInput label="Email Zoom" type="email" placeholder="zoom1@example.com" value={email} onChange={(event) => setEmail(event.currentTarget.value)} required style={{ flex: 1, minWidth: 220 }} /><PasswordInput label="Kata sandi Zoom" placeholder="Kata sandi akun Zoom" value={password} onChange={(event) => setPassword(event.currentTarget.value)} required maxLength={200} style={{ flex: 1, minWidth: 200 }} /><Button type="submit" loading={busy} leftSection={<IconPlus size={16} />}>Tambah akun</Button></Group></form>
    </Stack></Card>
    <Card withBorder radius="lg" p="lg"><Stack gap="sm"><Text fw={700}>Akun terdaftar</Text>{loading ? <Group><Loader size="sm" /><Text size="sm">Memuat akun…</Text></Group> : accounts.length ? accounts.map((account) => <Group key={account.id} justify="space-between" p="sm" style={{ border: "1px solid var(--mantine-color-default-border)", borderRadius: 12 }}><div><Text fw={600}>{account.name}</Text><Text size="sm" c="dimmed">{account.email}</Text><Text size="sm" c="dimmed">Kata sandi: <Text span ff="monospace" c="dark" fw={600}>{account.password || "—"}</Text></Text></div><Switch label={account.active ? "Aktif" : "Nonaktif"} checked={account.active} disabled={busy} onChange={(event) => void setActive(account, event.currentTarget.checked)} /></Group>) : <Text size="sm" c="dimmed">Belum ada akun Zoom. Tambahkan akun untuk mengaktifkan penjadwalan kelas.</Text>}</Stack></Card>
  </Stack>;
}
