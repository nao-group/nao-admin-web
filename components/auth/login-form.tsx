"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Box, Button, Card, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { defaultAdminRoute } from "@/lib/admin-access";
import { AuthApiError, getAdminSession, loginAdmin } from "@/lib/auth-api";
import { useAuthStore } from "@/store/auth";

export function LoginForm() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      if (caught instanceof AuthApiError && caught.status === 403) {
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

  return <Box className="login-page"><Box className="login-ambient login-ambient-one" /><Box className="login-ambient login-ambient-two" /><Card className="login-card" p={{ base: 28, sm: 40 }}><Stack gap={26}><Box><Image src="/images/logo/nao_full_dark.png" alt="NAO Group" width={170} height={70} className="login-logo" priority /></Box><Box><Title order={1} className="editorial-title">Welcome back.</Title><Text c="dimmed" mt={8} lh={1.6}>Masuk untuk mengelola member, pembayaran, dan komunikasi NAO Group.</Text></Box><form onSubmit={handleSubmit}><Stack gap="md"><TextInput label="Email admin" value={email} onChange={(event) => setEmail(event.currentTarget.value)} size="md" autoComplete="email" required /><PasswordInput label="Password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} size="md" autoComplete="current-password" required />{error && <Text size="sm" c="red.7" role="alert">{error}</Text>}<Button type="submit" size="md" fullWidth className="primary-action" rightSection={<IconCheck size={17} />} loading={submitting}>Sign in to dashboard</Button></Stack></form><Text size="xs" c="dimmed" ta="center">Restricted access · NAO Group internal team</Text></Stack></Card><Text className="login-caption">One place to understand and grow the NAO community.</Text></Box>;
}
