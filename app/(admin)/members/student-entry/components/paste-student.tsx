"use client";
import { useMemo, useState } from "react";
import { Alert, Button, Card, Group, Stack, Text, Textarea } from "@mantine/core";
import { IconClipboardText } from "@tabler/icons-react";
import { FIELD_LABELS, SAMPLE_TEXT } from "../data";
import { parseStudentText } from "../parse";
import type { StudentDraft, StudentField } from "../types";

export function PasteStudent({ onApply }: { onApply: (values: Partial<StudentDraft>) => void }) {
  const [text, setText] = useState("");
  const parsed = useMemo(() => parseStudentText(text), [text]);
  const fields = Object.keys(parsed.values) as StudentField[];
  return <Card withBorder radius="md" p="lg"><Stack gap="md">
    <Text fw={700}>Isi otomatis dari teks</Text>
    <Text size="sm" c="dimmed">Gunakan satu field per baris: Label: nilai. Label bahasa Indonesia dan Inggris didukung.</Text>
    <Textarea label="Teks data murid" placeholder={SAMPLE_TEXT} minRows={7} maxRows={14} autosize maxLength={10000} value={text} onChange={(event) => setText(event.currentTarget.value)} />
    <Group><Button variant="light" size="xs" onClick={() => setText(SAMPLE_TEXT)}>Gunakan contoh</Button><Button variant="subtle" color="gray" size="xs" disabled={!text} onClick={() => setText("")}>Kosongkan teks</Button></Group>
    {text.trim() && <>
      <Text size="sm" role="status">{fields.length} field dikenali{fields.length ? `: ${fields.map((field) => FIELD_LABELS[field]).join(", ")}.` : "."}</Text>
      {parsed.warnings.length > 0 && <Alert color="yellow" title="Periksa teks"><Stack gap={4}>{parsed.warnings.map((warning, index) => <Text size="xs" key={index}>{warning}</Text>)}</Stack></Alert>}
    </>}
    <Button variant="light" leftSection={<IconClipboardText size={17} />} disabled={!fields.length} onClick={() => onApply(parsed.values)}>Terapkan ke form</Button>
    <Text size="xs" c="dimmed">Hanya field yang dikenali akan diganti. Tinjau kembali data setelah diterapkan.</Text>
  </Stack></Card>;
}
