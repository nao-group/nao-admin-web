import katex from "katex";

// Matches $$...$$ (display), $...$ (inline), \[...\] (display), \(...\) (inline).
// Longer/display delimiters are checked first so they win over shorter ones.
export const MATH_RE = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^\$\n]+?\$|\\\([\s\S]+?\\\))/g;

export function renderMath(latex: string, display: boolean): string {
  return katex.renderToString(latex, { throwOnError: false, displayMode: display });
}

// A LaTeX command with its brace arguments, e.g. "\frac{1}{6}", "\sqrt{2}", "\pi".
const BARE_LATEX_RE = /\\[a-zA-Z]+(?:\s*\{[^{}]*\})*/g;

/**
 * Wraps undelimited LaTeX in `$…$` so it still renders as math.
 *
 * Most question content delimits its math properly, but some rows store options
 * as bare "\frac{1}{6}" with no `$` at all — the generator doesn't guarantee
 * delimiters. Without this those render as literal backslash-soup.
 *
 * Deliberately conservative: a string containing ANY `$` is returned untouched,
 * on the assumption its author delimited deliberately and anything left outside
 * those delimiters is meant to be prose. That keeps this from second-guessing
 * the (much more common) correctly-delimited content, so the only strings it can
 * affect are ones that currently render broken anyway.
 */
export function wrapBareLatex(text: string): string {
  if (!text || text.includes("$")) return text;
  return text.replace(BARE_LATEX_RE, (m) => `$${m}$`);
}

/** Split text into math / non-math segments, tolerating undelimited LaTeX. */
export function splitMath(text: string): string[] {
  return wrapBareLatex(text).split(MATH_RE);
}

// Flattening markdown/LaTeX to plain text for compact rows and search previews
// deliberately lives on the SERVER (to_plain_text in services/bookmarks.py), not
// here. Search matching happens server-side, so a client-side copy meant the list
// could show a suggestion the real search then failed to find. The API returns the
// flattened string alongside the source (e.g. question_text_plain) — use that.
