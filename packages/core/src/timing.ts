// Audio-first timing (docs/03 §5).

export const WORDS_PER_SECOND = 2.5; // ≈150 wpm; recalibrated per voice later

export function targetWordCount(durationS: number, wps = WORDS_PER_SECOND): number {
  return Math.round(durationS * wps);
}

export interface AlignedWord {
  text: string;
  startMs: number;
  endMs: number;
}

export interface SceneSpan {
  wordStart: number; // inclusive
  wordEnd: number; // inclusive
}

export interface TimedScene extends SceneSpan {
  startMs: number;
  endMs: number;
}

const LEAD_MS = 120;
const TAIL_MS = 600;

/** Scene boundaries come from word timings: a scene starts slightly before its first word and ends where the next begins. */
export function timeScenes(words: AlignedWord[], spans: SceneSpan[]): TimedScene[] {
  if (spans.length === 0) return [];
  spans.forEach((s, i) => {
    if (s.wordStart > s.wordEnd) throw new Error(`span ${i} is empty`);
    if (s.wordEnd >= words.length) throw new Error(`span ${i} exceeds word count`);
    if (i > 0 && s.wordStart !== spans[i - 1]!.wordEnd + 1) throw new Error(`span ${i} is not contiguous`);
  });
  if (spans[0]!.wordStart !== 0) throw new Error("first span must start at word 0");
  if (spans.at(-1)!.wordEnd !== words.length - 1) throw new Error("last span must end at the final word");

  const starts = spans.map((s, i) => (i === 0 ? 0 : Math.max(0, words[s.wordStart]!.startMs - LEAD_MS)));
  return spans.map((s, i) => ({
    ...s,
    startMs: starts[i]!,
    endMs: i + 1 < spans.length ? starts[i + 1]! : words[s.wordEnd]!.endMs + TAIL_MS,
  }));
}

export interface ModelDurationRule {
  min: number;
  max: number;
  allowed?: number[]; // discrete options, seconds
}

/** Duration (s) to request from a video model so the clip covers the scene; renderer trims/retimes afterwards. */
export function requestDurationS(sceneMs: number, rule: ModelDurationRule): number {
  const need = Math.ceil(sceneMs / 1000);
  if (rule.allowed?.length) {
    const fit = rule.allowed.filter((d) => d >= need).sort((a, b) => a - b)[0];
    return fit ?? Math.max(...rule.allowed);
  }
  return Math.min(rule.max, Math.max(rule.min, need));
}

/** How the renderer fits a clip to the scene: trim, slow down ≤ 20%, or hold the last frame. */
export function fitClip(clipMs: number, sceneMs: number): { mode: "trim" | "slow" | "hold"; factor: number } {
  if (clipMs >= sceneMs) return { mode: "trim", factor: 1 };
  const factor = sceneMs / clipMs;
  return factor <= 1.2 ? { mode: "slow", factor } : { mode: "hold", factor };
}
