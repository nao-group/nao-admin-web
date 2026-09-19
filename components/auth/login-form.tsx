"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Box, Button, Card, Group, Modal, PasswordInput, Radio, Stack, Text, TextInput, ThemeIcon, Title } from "@mantine/core";
import { IconCheck, IconDeviceDesktop, IconLogout } from "@tabler/icons-react";
import { defaultAdminRoute } from "@/lib/admin-access";
import { AuthApiError, getAdminSession, loginAdmin, revokeAdminDevice, type MaxDevicesPayload } from "@/lib/auth-api";
import { useAuthStore } from "@/store/auth";

export function LoginForm() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [maxDevices, setMaxDevices] = useState<MaxDevicesPayload | null>(null);
  const [selectedSession, setSelectedSession] = useState("");
  const [revoking, setRevoking] = useState(false);
  const [deviceError, setDeviceError] = useState("");

  useEffect(() => {
    getAdminSession().then((session) => {
      setSession(session);
      router.replace(defaultAdminRoute(session.roles));
    }).catch(() => undefined);
  }, [router, setSession]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.includes("@") || password.length < 8) {
      setError("Masukkan email yang valid dan password minimal 8 karakter.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const session = await loginAdmin(email.trim(), password);
      setSession(session);
      router.replace(defaultAdminRoute(session.roles));
    } catch (caught) {
      if (caught instanceof AuthApiError && caught.status === 409) {
        const sessions = Array.isArray(caught.data.sessions) ? caught.data.sessions as MaxDevicesPayload["sessions"] : [];
        const payload = { login_token: String(caught.data.login_token ?? ""), sessions };
        setMaxDevices(payload);
        setSelectedSession(sessions[0]?.session_id ?? "");
        setDeviceError("");
      } else if (caught instanceof AuthApiError && caught.status === 403) {
        setError("Akun ini tidak memiliki akses ke NAO Admin.");
      } else if (caught instanceof AuthApiError && caught.status === 401) {
        setError("Email atau password salah.");
      } else {
        setError(caught instanceof Error ? caught.message : "Login gagal. Coba lagi.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke() {
    if (!maxDevices || !selectedSession) return;
    setRevoking(true);
    setError("");
    setDeviceError("");
    try {
      const session = await revokeAdminDevice(maxDevices.login_token, selectedSession);
      setMaxDevices(null);
      setSession(session);
      router.replace(defaultAdminRoute(session.roles));
    } catch (caught) {
      if (caught instanceof AuthApiError && [400, 404].includes(caught.status)) {
        setMaxDevices(null);
        setError("Sesi login sudah kedaluwarsa. Silakan login kembali.");
      } else {
        setDeviceError(caught instanceof Error ? caught.message : "Gagal sign out perangkat. Coba lagi.");
      }
    } finally { setRevoking(false); }
  }

  const deviceLabel = (device: string) => {
    const browser = device.includes("Edg/") ? "Edge" : device.includes("Chrome/") ? "Chrome" : device.includes("Firefox/") ? "Firefox" : device.includes("Safari/") ? "Safari" : "Browser";
    const platform = device.includes("Windows") ? "Windows" : device.includes("Macintosh") ? "macOS" : device.includes("Android") ? "Android" : /iPhone|iPad/.test(device) ? "iOS" : "Unknown device";
    return `${browser} on ${platform}`;
  };

  return <Box className="login-page"><Box className="login-ambient login-ambient-one" /><Box className="login-ambient login-ambient-two" /><Card className="login-card" p={{ base: 28, sm: 40 }}><Stack gap={26}><Box><Image src="/images/logo/nao_full_dark.png" alt="NAO Group" width={170} height={70} className="login-logo" priority /></Box><Box><Title order={1} className="editorial-title">Welcome back.</Title><Text c="dimmed" mt={8} lh={1.6}>Masuk untuk mengelola member, pembayaran, dan komunikasi NAO Group.</Text></Box><form onSubmit={handleSubmit}><Stack gap="md"><TextInput label="Email admin" value={email} onChange={(event) => setEmail(event.currentTarget.value)} size="md" autoComplete="email" required /><PasswordInput label="Password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} size="md" autoComplete="current-password" required />{error && <Text size="sm" c="red.7" role="alert">{error}</Text>}<Button type="submit" size="md" fullWidth className="primary-action" rightSection={<IconCheck size={17} />} loading={submitting}>Sign in to dashboard</Button></Stack></form><Text size="xs" c="dimmed" ta="center">Restricted access · NAO Group internal team</Text></Stack></Card><Text className="login-caption">One place to understand and grow the NAO community.</Text>
    <Modal opened={Boolean(maxDevices)} onClose={() => { if (!revoking) { setMaxDevices(null); setDeviceError(""); } }} closeOnClickOutside={!revoking} closeOnEscape={!revoking} withCloseButton={!revoking} title={<Text fw={700} size="lg">Device limit reached</Text>} centered size="md">
      <Stack gap="lg"><Text size="sm" c="dimmed">You&apos;re already signed in on the maximum number of devices. Choose one device to sign out so you can continue to NAO Admin.</Text><Radio.Group value={selectedSession} onChange={setSelectedSession}><Stack gap="sm">{maxDevices?.sessions.map((session) => <Radio.Card key={session.session_id} value={session.session_id} className="login-device-card" data-checked={selectedSession === session.session_id || undefined} p="md" radius="md"><Group wrap="nowrap"><ThemeIcon color="gray" variant="light" size={40} radius="xl"><IconDeviceDesktop size={19}/></ThemeIcon><Box flex={1} miw={0}><Text size="sm" fw={700}>{deviceLabel(session.device)}</Text><Text size="xs" c="dimmed" mt={3}>Signed in {new Date(session.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</Text></Box><Radio.Indicator/></Group></Radio.Card>)}</Stack></Radio.Group>{deviceError && <Text size="sm" c="red.7" role="alert">{deviceError}</Text>}<Button fullWidth size="md" className="primary-action" loading={revoking} disabled={!selectedSession} leftSection={<IconLogout size={17}/>} onClick={() => void handleRevoke()}>Sign out selected device & continue</Button></Stack>
    </Modal>
  </Box>;
}
