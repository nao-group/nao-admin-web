"use client";

import { cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import { Stack, Text, Tooltip, rem } from "@mantine/core";
import { renderInlineMarkdown } from "@/components/markdown-latex-text";
import { splitMath } from "@/lib/latex";
import type { EnVocabEntry, Vocab, VocabEntry } from "./types";

type Language = "en" | "zh";
type TranslationMatch = VocabEntry | { zh: string; pinyin?: string };
type Segment = { text: string; match?: TranslationMatch };

// Private-use characters keep vocab placeholders separate from the NUL-based
// placeholders used internally by the shared Markdown/LaTeX renderer.
const VOCAB_START = "\uE000";
const VOCAB_END = "\uE001";
const LINE_BREAK = "\uE002";
const PLACEHOLDER_RE = /(\uE000\d+\uE001|\uE002)/;

export function englishVocabToAlignment(vocab: Record<string, EnVocabEntry> = {}): Vocab {
  return Object.fromEntries(
    Object.entries(vocab)
      .filter(([english, entry]) => Boolean(english.trim() && typeof entry?.zh === "string" && entry.zh.trim()))
      .map(([english, entry]) => [entry.zh, { en: english, pinyin: entry.pinyin }]),
  );
}

function translationEntries(vocab: Vocab, language: Language): Array<[string, TranslationMatch]> {
  if (language === "zh") {
    return Object.entries(vocab)
      .filter(([word, entry]) => Boolean(word && typeof entry?.en === "string" && entry.en.trim()))
      .sort((a, b) => b[0].length - a[0].length);
  }

  return Object.entries(vocab)
    .filter(([zh, entry]) => Boolean(zh && typeof entry?.en === "string" && entry.en.trim()))
    .map(([zh, entry]) => [entry.en_phrase || entry.en, { zh, pinyin: entry.pinyin }] as [string, TranslationMatch])
    .sort((a, b) => b[0].length - a[0].length);
}

function annotate(text: string, entries: Array<[string, TranslationMatch]>, caseSensitive: boolean): Segment[] {
  const covered: Array<{ match: TranslationMatch; start: number; end: number } | null> = new Array(text.length).fill(null);
  const haystack = caseSensitive ? text : text.toLowerCase();

  for (const [term, match] of entries) {
    if (!term) continue;
    const needle = caseSensitive ? term : term.toLowerCase();
    let position = 0;
    while (position < text.length) {
      const index = haystack.indexOf(needle, position);
      if (index === -1) break;
      const end = index + term.length;
      if (!covered.slice(index, end).some(Boolean)) {
        for (let cursor = index; cursor < end; cursor += 1) covered[cursor] = { match, start: index, end };
      }
      position = index + 1;
    }
  }

  const segments: Segment[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const annotation = covered[cursor];
    if (annotation?.start === cursor) {
      segments.push({ text: text.slice(annotation.start, annotation.end), match: annotation.match });
      cursor = annotation.end;
      continue;
    }
    let end = cursor + 1;
    while (end < text.length && !covered[end]) end += 1;
    segments.push({ text: text.slice(cursor, end) });
    cursor = end;
  }
  return segments;
}

function expandPlaceholders(node: ReactNode, replacements: Map<string, ReactElement>, key: string): ReactNode {
  if (typeof node === "string") {
    if (!node.includes(VOCAB_START) && !node.includes(LINE_BREAK)) return node;
    return node.split(PLACEHOLDER_RE).map((part, index) => {
      if (part === LINE_BREAK) return <br key={`${key}-br-${index}`} />;
      const replacement = replacements.get(part);
      return replacement ? cloneElement(replacement, { key: `${key}-token-${index}` }) : part;
    });
  }
  if (Array.isArray(node)) return node.map((child, index) => expandPlaceholders(child, replacements, `${key}-${index}`));
  if (isValidElement<{ children?: ReactNode }>(node) && node.props.children != null) {
    return cloneElement(node, {}, expandPlaceholders(node.props.children, replacements, `${key}-child`));
  }
  return node;
}

function TranslationToken({ text, match, language }: { text: string; match: TranslationMatch; language: Language }) {
  const [active, setActive] = useState(false);
  const translatedValue = language === "zh" ? (match as VocabEntry).en : (match as { zh: string }).zh;
  const translation = typeof translatedValue === "string" && translatedValue.trim() ? translatedValue : text;
  const pinyin = match.pinyin;

  return (
    <Tooltip
      withArrow
      position="top"
      openDelay={120}
      events={{ hover: true, focus: true, touch: true }}
      label={
        <Stack gap={1} align="center">
          <Text size="sm" fw={700} c="white">{translation}</Text>
          {pinyin && <Text size="xs" c="blue.2">{pinyin}</Text>}
        </Stack>
      }
    >
      <span
        tabIndex={0}
        aria-label={`${text}: ${translation}${pinyin ? `, ${pinyin}` : ""}`}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        style={{
          cursor: "default",
          borderRadius: rem(3),
          paddingInline: rem(1),
          backgroundColor: active ? "rgba(147, 197, 253, 0.25)" : "transparent",
          transition: "background-color 120ms ease",
        }}
      >
        {text}
      </span>
    </Tooltip>
  );
}

function renderAnnotatedMarkdown(
  text: string,
  entries: Array<[string, TranslationMatch]>,
  language: Language,
  key: string,
): ReactElement[] {
  const replacements = new Map<string, ReactElement>();
  let placeholderIndex = 0;
  let markdown = "";

  for (const part of splitMath(text)) {
    const isMath = (part.startsWith("$$") && part.endsWith("$$")) || (part.startsWith("$") && part.endsWith("$"));
    if (isMath) {
      markdown += part;
      continue;
    }

    for (const segment of annotate(part, entries, language === "zh")) {
      if (!segment.match) {
        markdown += segment.text;
        continue;
      }
      const placeholder = `${VOCAB_START}${placeholderIndex}${VOCAB_END}`;
      replacements.set(placeholder, <TranslationToken text={segment.text} match={segment.match} language={language} />);
      markdown += placeholder;
      placeholderIndex += 1;
    }
  }

  const nodes = renderInlineMarkdown(markdown.replace(/\r?\n/g, LINE_BREAK), key);
  return nodes.map((node, index) =>
    cloneElement(expandPlaceholders(node, replacements, `${key}-${index}`) as ReactElement, { key: `${key}-${index}` }),
  );
}

export function AlignedText({
  text,
  vocab,
  language,
  block = false,
}: {
  text: string;
  vocab?: Vocab;
  language: Language;
  block?: boolean;
}) {
  const entries = translationEntries(vocab ?? {}, language);
  if (entries.length === 0) return <>{renderAnnotatedMarkdown(text, [], language, "plain")}</>;

  if (!block) return <>{renderAnnotatedMarkdown(text, entries, language, "inline")}</>;

  return (
    <div style={{ lineHeight: 1.8 }}>
      {text.split(/\n{2,}/).map((paragraph, index, paragraphs) => {
        const lines = paragraph.split(/\r?\n/);
        const isBlockquote = lines.length > 0 && lines.every((line) => line.trimStart().startsWith(">"));
        const content = isBlockquote
          ? lines.map((line) => line.replace(/^>\s?/, "")).join("\n")
          : paragraph;

        return (
          <div
            key={index}
            style={isBlockquote ? {
              margin: `0 0 ${index === paragraphs.length - 1 ? 0 : "0.75em"}`,
              padding: `${rem(8)} ${rem(12)}`,
              borderLeft: "3px solid var(--mantine-color-yellow-6)",
              borderRadius: rem(6),
              background: "var(--mantine-color-yellow-0)",
            } : { marginBottom: index === paragraphs.length - 1 ? 0 : "0.75em" }}
          >
            {renderAnnotatedMarkdown(content, entries, language, `paragraph-${index}`)}
          </div>
        );
      })}
    </div>
  );
}
