// Aligns our script tokens to STT word timings (docs/03 §5.3): captions use OUR spelling, timings come from audio.
import type { AlignedWord } from "./timing.ts";

export interface SttWord {
  text: string;
  start: number; // seconds
  end: number; // seconds
}

/** Narration → tokens. Index i here is the "word index" the scene plan refers to. */
export function tokenize(text: string): string[] {
  return text
    .replace(/[—–]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => /[\p{L}\p{N}]/u.test(t));
}

export function normalizeToken(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * Needleman–Wunsch style alignment of script tokens vs STT words (match / substitute / skip),
 * then every script token gets a time: matched → STT timing, unmatched → interpolated between neighbours.
 */
export function alignTokens(tokens: string[], stt: SttWord[]): AlignedWord[] {
  const words = stt.filter((w) => normalizeToken(w.text).length > 0);
  if (tokens.length === 0) return [];
  if (words.length === 0) throw new Error("no STT words to align against");

  const a = tokens.map(normalizeToken);
  const b = words.map((w) => normalizeToken(w.text));
  const n = a.length, m = b.length;
  const GAP = 1, SUB = 1;
  const cost: number[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const same = a[i - 1] === b[j - 1] ? 0 : SUB;
      cost[i]![j] = Math.min(cost[i - 1]![j - 1]! + same, cost[i - 1]![j]! + GAP, cost[i]![j - 1]! + GAP);
    }
  }

  // backtrack: token i -> stt index j (or -1)
  const map = new Array<number>(n).fill(-1);
  let i = n, j = m;
  while (i > 0 && j > 0) {
    const same = a[i - 1] === b[j - 1] ? 0 : SUB;
    if (cost[i]![j] === cost[i - 1]![j - 1]! + same) {
      map[i - 1] = j - 1; // match or substitution: still the same spoken slot
      i--; j--;
    } else if (cost[i]![j] === cost[i - 1]![j]! + GAP) {
      i--; // token not spoken / merged
    } else {
      j--; // extra STT word
    }
  }

  const out: AlignedWord[] = tokens.map((text, k) => {
    const w = map[k]! >= 0 ? words[map[k]!]! : null;
    return { text, startMs: w ? Math.round(w.start * 1000) : -1, endMs: w ? Math.round(w.end * 1000) : -1 };
  });

  // interpolate unmatched tokens between known neighbours
  for (let k = 0; k < out.length; k++) {
    if (out[k]!.startMs >= 0) continue;
    let p = k - 1; while (p >= 0 && out[p]!.startMs < 0) p--;
    let q = k + 1; while (q < out.length && out[q]!.startMs < 0) q++;
    const from = p >= 0 ? out[p]!.endMs : 0;
    const to = q < out.length ? out[q]!.startMs : Math.round(words.at(-1)!.end * 1000);
    const span = q - p - 1;
    const slot = (to - from) / Math.max(1, span);
    const pos = k - p - 1;
    out[k] = { text: out[k]!.text, startMs: Math.round(from + slot * pos), endMs: Math.round(from + slot * (pos + 1)) };
  }
  return out;
}
