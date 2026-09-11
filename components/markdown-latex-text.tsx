"use client";

import { PRIMARY, INK } from "@/constants/colors";
import { rem } from "@mantine/core";
import { splitMath, renderMath, MATH_RE } from "@/lib/latex";

const BOLD_RE = /(\*\*(?:[^*]|\*(?!\*))+\*\*)/g;
// Runs after BOLD_RE has already consumed every `**...**` span, so a lone `*` or `_`
// pair left over is safe to treat as italics.
const ITALIC_RE = /(\*[^*\n]+\*|_[^_\n]+_)/g;
const LINK_RE = /(\[[^\]\n]+\]\([^)\s]+\))/g;
const CODE_RE = /(`[^`]+`)/g;
const CIRCLE_RE = /(\{\d+\})/g;
// Defense-in-depth: models are told never to use markdown headings, but a stray
// "#### Step 1" shouldn't render as literal hash characters if one slips through.
const HEADING_RE = /^#{1,6}\s+(.*)$/;
// Defense-in-depth: models are told to write "1. " as plain text, but a stray
// "- item" / "* item" bullet list shouldn't render as literal dashes/asterisks.
// Leading whitespace is allowed (indented bullets) and trailing whitespace is stripped.
const BULLET_RE = /^[ \t]*[-*•]\s+(.*?)[ \t]*$/;
const CORRECT_DARK = "#116451";

/** Leaf: plain text only — no further parsing */
function plainText(text: string, key: string): React.ReactElement {
  return <span key={key}>{text}</span>;
}

/** Circle badge for {N} */
export function CircleBadge({ n, keyStr }: { n: string; keyStr?: string }) {
  return (
    <span
      key={keyStr}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: rem(22),
        height: rem(22),
        borderRadius: "50%",
        backgroundColor: "#F0F4FF",
        color: "#6670B0",
        fontSize: rem(11),
        fontWeight: 700,
        verticalAlign: "middle",
        flexShrink: 0,
        margin: `0 ${rem(2)}`,
      }}
    >
      {n}
    </span>
  );
}

/**
 * Parsing order (outermost → innermost):
 *   Bold → Italic → Math → Link → Code → CircleNum → plain text
 *
 * Bold and Italic must both run before Math — models routinely wrap inline
 * math in emphasis, e.g. "**$45^\circ$**" or "*(hint: $\tan(45^\circ)$...)*",
 * and matching the emphasis markers first (before Math splits the string
 * apart) is the only way that whole span is recognized as one emphasis run,
 * rather than two orphaned, unmatched markers on either side of the math.
 * Math still runs before CircleNum beneath it, so {N} inside LaTeX (e.g.
 * \frac{0.5}{4}) is still never seen by the circle parser.
 */
function parseBold(text: string, keyPrefix: string, circleNums: boolean): React.ReactElement[] {
  return text.split(BOLD_RE).flatMap((part, i): React.ReactElement[] => {
    const key = `${keyPrefix}-b${i}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return [<strong key={key}>{parseItalic(part.slice(2, -2), key, circleNums)}</strong>];
    }
    return parseItalic(part, key, circleNums);
  });
}

function parseItalic(text: string, keyPrefix: string, circleNums: boolean): React.ReactElement[] {
  // Protect math expressions from underscore-italic mis-parsing.
  // LaTeX subscripts like _{92} resemble italic _..._ markers and break math
  // when the italic regex consumes them first.  Extract math into placeholders,
  // run italic detection on the safe string, then restore before handing to parseMath.
  const extracted: string[] = [];
  const shielded = text.replace(new RegExp(MATH_RE.source, "g"), (m) => {
    extracted.push(m);
    return `\x00${extracted.length - 1}\x00`;
  });

  const RESTORE_RE = /\x00(\d+)\x00/g;
  function restore(s: string): string {
    if (!extracted.length) return s;
    return s.replace(RESTORE_RE, (_, i) => extracted[Number(i)]);
  }

  return shielded.split(ITALIC_RE).flatMap((part, i): React.ReactElement[] => {
    const key = `${keyPrefix}-i${i}`;
    const isItalic = (part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"));
    if (isItalic) {
      return [<em key={key}>{parseMath(restore(part.slice(1, -1)), key, circleNums)}</em>];
    }
    return parseMath(restore(part), key, circleNums);
  });
}

function parseMath(text: string, keyPrefix: string, circleNums: boolean): React.ReactElement[] {
  return splitMath(text).flatMap((part, i): React.ReactElement[] => {
    const key = `${keyPrefix}-m${i}`;
    if (part.startsWith("$$") && part.endsWith("$$")) {
      return [
        <span
          key={key}
          className="markdown-display-math"
          style={{ display: "block", textAlign: "center", margin: "0.3em 0" }}
          dangerouslySetInnerHTML={{ __html: renderMath(part.slice(2, -2), true) }}
        />,
      ];
    }
    if (part.startsWith("\\[") && part.endsWith("\\]")) {
      return [
        <span
          key={key}
          className="markdown-display-math"
          style={{ display: "block", textAlign: "center", margin: "0.3em 0" }}
          dangerouslySetInnerHTML={{ __html: renderMath(part.slice(2, -2), true) }}
        />,
      ];
    }
    if (part.startsWith("\\(") && part.endsWith("\\)")) {
      return [
        <span
          key={key}
          className="markdown-inline-code"
          dangerouslySetInnerHTML={{ __html: renderMath(part.slice(2, -2), false) }}
        />,
      ];
    }
    if (part.startsWith("$") && part.endsWith("$")) {
      return [
        <span
          key={key}
          dangerouslySetInnerHTML={{ __html: renderMath(part.slice(1, -1), false) }}
        />,
      ];
    }
    // Non-math segment — continue parsing
    return parseLink(part, key, circleNums);
  });
}

function parseLink(text: string, keyPrefix: string, circleNums: boolean): React.ReactElement[] {
  return text.split(LINK_RE).flatMap((part, i): React.ReactElement[] => {
    const key = `${keyPrefix}-a${i}`;
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (m) {
      return [
        <a
          key={key}
          href={m[2]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: PRIMARY, textDecoration: "underline" }}
        >
          {parseCode(m[1], key, circleNums)}
        </a>,
      ];
    }
    return parseCode(part, key, circleNums);
  });
}

function parseCode(text: string, keyPrefix: string, circleNums: boolean): React.ReactElement[] {
  return text.split(CODE_RE).flatMap((part, i): React.ReactElement[] => {
    const key = `${keyPrefix}-c${i}`;
    if (part.startsWith("`") && part.endsWith("`")) {
      return [
        <span
          key={key}
          style={{
            display: "inline-block",
            backgroundColor: "#F5E6CC",
            color: CORRECT_DARK,
            borderRadius: rem(4),
            padding: `0 ${rem(6)}`,
            fontWeight: 600,
            fontSize: "0.9em",
            lineHeight: 1.5,
          }}
        >
          {part.slice(1, -1)}
        </span>,
      ];
    }
    if (circleNums) return parseCircleNum(part, key);
    return [plainText(part, key)];
  });
}

function parseCircleNum(text: string, keyPrefix: string): React.ReactElement[] {
  return text.split(CIRCLE_RE).map((part, i) => {
    const key = `${keyPrefix}-n${i}`;
    const m = part.match(/^\{(\d+)\}$/);
    if (m) return <CircleBadge key={key} n={m[1]} keyStr={key} />;
    return plainText(part, key);
  });
}

/**
 * Renders a single line of inline markdown (bold, italic, math, links, code)
 * without block-level elements (no paragraphs, blockquotes, bullets).
 * Useful for embedding markdown-formatted text inline within custom JSX.
 */
export function renderInlineMarkdown(text: string, keyPrefix: string): React.ReactElement[] {
  return parseBold(text, keyPrefix, false);
}

/**
 * Renders a markdown-style string with support for:
 * - **bold** and italic (single asterisk or underscore) text
 * - `inline code` (rendered as amber highlight chip)
 * - [link text](url)
 * - $inline$ and $$display$$ LaTeX math
 * - > blockquote lines (rendered as highlighted answer box)
 * - "- " / "* " bullet list blocks
 * - Paragraphs separated by blank lines
 * - Line breaks within paragraphs
 * - {N} circle number badges (opt-in via circleNums prop)
 */
export function MarkdownLatexText({ children, circleNums = false }: { children: string; circleNums?: boolean }) {
  const blocks = children.split(/\n\n+/);

  return (
    <div className="markdown-rich-text" style={{ lineHeight: 1.8, color: INK }}>
      {blocks.map((block, bi) => {
        const trimmed = block.trim();

        if (trimmed.startsWith(">")) {
          const bqLines = trimmed.split(/\r?\n|\r/);
          // Strip "> " or ">" prefix from every line in the block
          const strippedLines = bqLines.map((l) =>
            l.startsWith("> ") ? l.slice(2) : l.startsWith(">") ? l.slice(1) : l
          );
          return (
            <div
              key={bi}
              className="markdown-blockquote"
              style={{
                margin: "0.75em 0",
                padding: `${rem(10)} ${rem(14)}`,
                backgroundColor: "#F5E6CC",
                borderLeft: `3px solid ${PRIMARY}`,
                borderRadius: rem(6),
                fontWeight: 700,
                color: CORRECT_DARK,
              }}
            >
              {strippedLines.map((line, li) => (
                <span key={li} style={{ display: "block" }}>
                  {parseBold(line, `bq${bi}l${li}`, circleNums)}
                </span>
              ))}
            </div>
          );
        }

        // Split on all line-ending styles (\r\n, \r, \n) and trim trailing \r
        const lines = trimmed.split(/\r?\n|\r/).map((l) => l.replace(/\r$/, ""));
        const bulletMatches = lines.map((line) => line.match(BULLET_RE));
        const hasBullets = bulletMatches.some(Boolean);

        // Any block containing at least one bullet line uses segment-based rendering,
        // which correctly handles pure-bullet blocks AND mixed intro-text + bullet blocks.
        if (hasBullets) {
          type Seg = { type: "text" | "bullet"; lines: string[] };
          const segments: Seg[] = [];
          lines.forEach((line, li) => {
            const isBullet = !!bulletMatches[li];
            const last = segments[segments.length - 1];
            if (last && last.type === (isBullet ? "bullet" : "text")) {
              last.lines.push(line);
            } else {
              segments.push({ type: isBullet ? "bullet" : "text", lines: [line] });
            }
          });
          return (
            <div key={bi} style={{ marginBottom: "0.5em" }}>
              {segments.map((seg, si) => {
                if (seg.type === "bullet") {
                  const segMatches = seg.lines.map((l) => l.match(BULLET_RE));
                  return (
                    <ul key={si} style={{ margin: "0.2em 0 0.4em 0", paddingLeft: rem(22) }}>
                      {seg.lines.map((line, li) => (
                        <li key={li} style={{ marginBottom: rem(2) }}>
                          {parseBold(segMatches[li]![1], `p${bi}s${si}l${li}`, circleNums)}
                        </li>
                      ))}
                    </ul>
                  );
                }
                // Skip blank text segments between bullets
                if (seg.lines.every((l) => !l.trim())) return null;
                return (
                  <p key={si} style={{ margin: "0 0 0.3em 0" }}>
                    {seg.lines.map((line, li) => {
                      const heading = line.match(HEADING_RE);
                      const parsed = parseBold(heading ? heading[1] : line, `p${bi}s${si}l${li}`, circleNums);
                      return (
                        <span key={li} style={{ display: "contents" }}>
                          {li > 0 && <br />}
                          {heading ? <strong>{parsed}</strong> : parsed}
                        </span>
                      );
                    })}
                  </p>
                );
              })}
            </div>
          );
        }

        return (
          <div key={bi} style={{ margin: "0 0 0.6em 0" }}>
            {lines.map((line, li) => {
              const bulletMatch = line.match(BULLET_RE);
              if (bulletMatch) {
                return (
                  <div key={li} style={{ display: "flex", alignItems: "flex-start", gap: rem(6), marginBottom: rem(2), paddingLeft: rem(4) }}>
                    <span style={{ flexShrink: 0, marginTop: "0.15em" }}>•</span>
                    <span>{parseBold(bulletMatch[1], `p${bi}l${li}`, circleNums)}</span>
                  </div>
                );
              }
              const heading = line.match(HEADING_RE);
              const parsed = parseBold(heading ? heading[1] : line, `p${bi}l${li}`, circleNums);
              return (
                <span key={li} style={{ display: "block" }}>
                  {heading ? <strong>{parsed}</strong> : parsed}
                  {li < lines.length - 1 && !lines[li + 1]?.match(BULLET_RE) && !line.match(BULLET_RE) && <br />}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
