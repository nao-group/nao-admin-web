"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge, Box, Button, Card, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconCheck, IconSparkles } from "@tabler/icons-react";
import { useAuthStore } from "@/store/auth";

export function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("admin@naogroup.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.includes("@") || password.length < 6) {
      setError("Masukkan email admin dan password minimal 6 karakter.");
      return;
    }
    login();
    router.replace("/members");
  }

  return <Box className="login-page"><Box className="login-ambient login-ambient-one" /><Box className="login-ambient login-ambient-two" /><Card className="login-card" p={{ base: 28, sm: 40 }}><Stack gap={26}><Box><Image src="/images/logo/nao_full_dark.png" alt="NAO Group" width={170} height={70} className="login-logo" priority /></Box><Box><Title order={1} className="editorial-title">Welcome back.</Title><Text c="dimmed" mt={8} lh={1.6}>Masuk untuk mengelola member, pembayaran, dan komunikasi NAO Group.</Text></Box><form onSubmit={handleSubmit}><Stack gap="md"><TextInput label="Email admin" value={email} onChange={(event) => setEmail(event.currentTarget.value)} size="md" autoComplete="email" required /><PasswordInput label="Password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} size="md" autoComplete="current-password" required />{error && <Text size="sm" c="red.7" role="alert">{error}</Text>}<Button type="submit" size="md" fullWidth className="primary-action" rightSection={<IconCheck size={17} />}>Sign in to dashboard</Button></Stack></form><Text size="xs" c="dimmed" ta="center">Restricted access · NAO Group internal team</Text></Stack></Card><Text className="login-caption">One place to understand and grow the NAO community.</Text></Box>;
}
