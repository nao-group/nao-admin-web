"use client";

import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Group, Modal, PasswordInput, SimpleGrid, Stack, Switch, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconInfoCircle, IconKey } from "@tabler/icons-react";
import { getProviderSettings, saveProviderSettings } from "./api";
import type { ProviderKeyUpdate, ProviderName, ProviderSettings } from "./types";

const PROVIDERS: { id: ProviderName; label: string; help: string }[] = [
  { id: "anthropic", label: "Anthropic", help: "Claude OCR, bounding-box refinement, and image-based answers." },
  { id: "deepseek", label: "DeepSeek", help: "Text translation, answer generation, and DOCX extraction." },
  { id: "kimi", label: "Kimi", help: "Default OCR provider for images and PDFs." },
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
      color: "red", title: "Could not load API settings",
      message: error instanceof Error ? error.message : "Try again.",
    })).finally(() => setLoading(false)); }, 0);
    return () => window.clearTimeout(timer);
  }, [opened]);

  const save = async () => {
    setLoading(true);
    try {
      const data = await saveProviderSettings(draft);
      setSettings(data);
      notifications.show({ color: "teal", title: "API settings saved", message: "New jobs will use this configuration." });
      onSaved();
      onClose();
    } catch (error) {
      notifications.show({ color: "red", title: "Could not save API settings", message: error instanceof Error ? error.message : "Try again." });
    } finally { setLoading(false); }
  };

  return <Modal opened={opened} onClose={onClose} title="Question extraction API keys" size="xl" centered>
    <Stack gap="lg">
      <Alert color="blue" icon={<IconInfoCircle size={18} />}>
        Personal keys are encrypted on the server and are never returned to the browser. Existing keys stay unchanged when the field is left blank.
      </Alert>
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {PROVIDERS.map(({ id, label, help }) => {
          const status = settings?.providers[id];
          const personal = !draft[id].use_default;
          return <Card key={id} withBorder radius="lg" padding="lg">
            <Stack gap="md">
              <Group justify="space-between" wrap="nowrap"><Group gap="xs"><IconKey size={18}/><Text fw={700}>{label}</Text></Group>
                <Badge color={personal ? "yellow" : "gray"} variant="light">{personal ? "Personal" : "Default"}</Badge></Group>
              <Text size="sm" c="dimmed" mih={62}>{help}</Text>
              <Switch checked={personal} label="Use my own API key" onChange={(event) => setDraft((current) => ({
                ...current, [id]: { ...current[id], use_default: !event.currentTarget.checked },
              }))}/>
              {personal && <PasswordInput label={`${label} API key`} value={draft[id].api_key ?? ""}
                placeholder={status?.personal_key_configured ? "Saved — leave blank to keep" : "Paste API key"}
                autoComplete="new-password" onChange={(event) => setDraft((current) => ({
                  ...current, [id]: { ...current[id], api_key: event.currentTarget.value },
                }))}/>} 
              <Text size="xs" c={draft[id].use_default && !status?.default_key_configured ? "red" : "dimmed"}>
                {draft[id].use_default
                  ? status?.default_key_configured ? "Backend default is configured." : "Backend default is not configured."
                  : status?.personal_key_configured ? "A personal key is already stored." : "A personal key is required."}
              </Text>
            </Stack>
          </Card>;
        })}
      </SimpleGrid>
      <Group justify="flex-end"><Button variant="default" onClick={onClose}>Cancel</Button><Button color="dark" loading={loading} onClick={() => void save()}>Save settings</Button></Group>
    </Stack>
  </Modal>;
}
