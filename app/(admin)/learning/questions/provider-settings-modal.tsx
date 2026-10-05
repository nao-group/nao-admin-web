"use client";

import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Group, Modal, PasswordInput, SimpleGrid, Stack, Switch, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconInfoCircle, IconKey } from "@tabler/icons-react";
import { getProviderSettings, saveProviderSettings } from "./api";
import type { ProviderKeyUpdate, ProviderName, ProviderSettings } from "./types";

const PROVIDERS: { id: ProviderName; label: string; help: string }[] = [
  { id: "anthropic", label: "Anthropic", help: "OCR Claude, penyempurnaan bounding box, dan jawaban berbasis gambar." },
  { id: "deepseek", label: "DeepSeek", help: "Terjemahan teks, pembuatan jawaban, dan ekstraksi DOCX." },
  { id: "kimi", label: "Kimi", help: "Provider OCR default untuk gambar dan PDF." },
];

type Draft = Record<ProviderName, ProviderKeyUpdate>;
const EMPTY: Draft = {
  anthropic: { use_default: true, api_key: "" },
  deepseek: { use_default: true, api_key: "" },
  kimi: { use_default: true, api_key: "" },
};

export function ProviderSettingsModal({ opened, onClose, onSaved }: {
  opened: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!opened) return;
    const timer = window.setTimeout(() => { setLoading(true); void getProviderSettings().then((data) => {
      setSettings(data);
      setDraft(Object.fromEntries(PROVIDERS.map(({ id }) => [id, {
        use_default: data.providers[id].use_default, api_key: "",
      }])) as Draft);
    }).catch((error) => notifications.show({
      color: "red", title: "Gagal memuat pengaturan API",
      message: error instanceof Error ? error.message : "Silakan coba lagi.",
    })).finally(() => setLoading(false)); }, 0);
    return () => window.clearTimeout(timer);
  }, [opened]);

  const save = async () => {
    setLoading(true);
    try {
      const data = await saveProviderSettings(draft);
      setSettings(data);
      notifications.show({ color: "teal", title: "Pengaturan API tersimpan", message: "Job baru akan memakai konfigurasi ini." });
      onSaved();
      onClose();
    } catch (error) {
      notifications.show({ color: "red", title: "Gagal menyimpan pengaturan API", message: error instanceof Error ? error.message : "Silakan coba lagi." });
    } finally { setLoading(false); }
  };

  return <Modal opened={opened} onClose={onClose} title="API key ekstraksi soal" size={1200} centered>
    <Stack gap="lg">
      <Alert color="blue" icon={<IconInfoCircle size={18} />}>
        Key pribadi dienkripsi di server dan tidak pernah dikirim kembali ke browser. Key yang sudah ada tidak berubah jika kolom dibiarkan kosong.
      </Alert>
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {PROVIDERS.map(({ id, label, help }) => {
          const status = settings?.providers[id];
          const personal = !draft[id].use_default;
          return <Card key={id} withBorder radius="lg" padding="lg">
            <Stack gap="md">
              <Group justify="space-between" wrap="nowrap"><Group gap="xs" wrap="nowrap"><IconKey size={18}/><Text fw={700} style={{ whiteSpace: "nowrap" }}>{label}</Text></Group>
                <Badge color={personal ? "yellow" : "gray"} variant="light">{personal ? "Pribadi" : "Default"}</Badge></Group>
              <Text size="sm" c="dimmed" mih={62}>{help}</Text>
              <Switch checked={personal} label="Gunakan API key saya sendiri" onChange={(event) => {
                const checked = event.currentTarget.checked;
                setDraft((current) => ({
                  ...current, [id]: { ...current[id], use_default: !checked },
                }));
              }}/>
              {personal && (
                <PasswordInput label={`API key ${label}`} value={draft[id].api_key ?? ""}
                  placeholder={status?.personal_key_configured ? "Tersimpan — kosongkan untuk mempertahankan" : "Tempel API key"}
                  autoComplete="new-password" onChange={(event) => {
                    const apiKey = event.currentTarget.value;
                    setDraft((current) => ({
                      ...current, [id]: { ...current[id], api_key: apiKey },
                    }));
                  }}/>
              )}
              <Text size="xs" c={draft[id].use_default && !status?.default_key_configured ? "red" : "dimmed"}>
                {draft[id].use_default
                  ? status?.default_key_configured ? "Default backend sudah dikonfigurasi." : "Default backend belum dikonfigurasi."
                  : status?.personal_key_configured ? "Key pribadi sudah tersimpan." : "Key pribadi wajib diisi."}
              </Text>
            </Stack>
          </Card>;
        })}
      </SimpleGrid>
      <Group justify="flex-end"><Button variant="default" onClick={onClose}>Batal</Button><Button color="dark" loading={loading} onClick={() => void save()}>Simpan pengaturan</Button></Group>
    </Stack>
  </Modal>;
}
