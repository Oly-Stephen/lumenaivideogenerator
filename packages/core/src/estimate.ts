// Pre-generation cost estimate (docs/03 §9.2). Shared by the worker (stored on the project) and the web (live re-estimate).
import { estimateUsd, usdToCredits } from "./pricing.ts";
import { requestDurationS, WORDS_PER_SECOND } from "./timing.ts";

export interface EstimateScene {
  words: number;
  animate: boolean;
}

export interface EstimateInput {
  scenes: EstimateScene[];
  characters: number;
  quality: "budget" | "standard" | "premium";
  music: boolean;
  needsStyleFrame: boolean;
  needsCharacterSheets: boolean;
  motionRes: string; // e.g. "480P"
  markup?: number;
}

export interface EstimateItem {
  label: string;
  usd: number;
}

export interface Estimate {
  items: EstimateItem[];
  usd: number; // including retry buffer
  credits: number;
}

export const ENDPOINTS = {
  imageT2I: "google/nano-banana-2.1",
  image: "google/nano-banana-2.1/edit",
  video: "minimax/h3/image-to-video",
  stt: "fal-ai/elevenlabs/speech-to-text/scribe-v2",
  music: "fal-ai/stable-audio-3/medium/text-to-audio",
} as const;

export const RETRY_BUFFER = 0.15;
const XFADE_MS = 300;
const H3_RULE = { min: 5, max: 15 };

export function sceneSecondsFromWords(words: number): number {
  return words / WORDS_PER_SECOND;
}

export function motionSeconds(words: number): number {
  return requestDurationS(sceneSecondsFromWords(words) * 1000 + XFADE_MS, H3_RULE);
}

export function estimateProject(i: EstimateInput): Estimate {
  const items: EstimateItem[] = [];
  if (i.needsStyleFrame) items.push({ label: "Style frame", usd: estimateUsd({ endpoint: ENDPOINTS.imageT2I, images: 1 }) });
  if (i.needsCharacterSheets && i.characters > 0) {
    items.push({ label: `Character sheets ×${i.characters}`, usd: estimateUsd({ endpoint: ENDPOINTS.image, images: i.characters }) });
  }
  items.push({ label: `Keyframes ×${i.scenes.length}`, usd: estimateUsd({ endpoint: ENDPOINTS.image, images: i.scenes.length }) });
  const motionS = i.scenes.filter((s) => s.animate).reduce((a, s) => a + motionSeconds(s.words), 0);
  if (motionS > 0) {
    const n = i.scenes.filter((s) => s.animate).length;
    items.push({ label: `Motion ×${n} (${motionS}s @ ${i.motionRes})`, usd: estimateUsd({ endpoint: ENDPOINTS.video, seconds: motionS, resolution: i.motionRes }) });
  }
  const totalS = i.scenes.reduce((a, s) => a + sceneSecondsFromWords(s.words), 0);
  items.push({ label: "Word timing", usd: estimateUsd({ endpoint: ENDPOINTS.stt, seconds: totalS }) });
  if (i.music) items.push({ label: "Music bed", usd: estimateUsd({ endpoint: ENDPOINTS.music, images: 1 }) });
  return finish(items, i.markup);
}

export type RedoWhat = "keyframe" | "motion" | "both";

/** Cost of redoing one scene. An animated scene always needs new motion: the clip is generated from the keyframe. */
export function estimateScene(scene: EstimateScene, what: RedoWhat, motionRes: string, markup?: number): Estimate {
  const items: EstimateItem[] = [];
  if (what !== "motion") items.push({ label: "Keyframe", usd: estimateUsd({ endpoint: ENDPOINTS.image, images: 1 }) });
  if (scene.animate) {
    const s = motionSeconds(scene.words);
    items.push({ label: `Motion (${s}s)`, usd: estimateUsd({ endpoint: ENDPOINTS.video, seconds: s, resolution: motionRes }) });
  }
  return finish(items, markup);
}

function finish(items: EstimateItem[], markup = 1): Estimate {
  const base = items.reduce((a, it) => a + it.usd, 0);
  const usd = base * (1 + RETRY_BUFFER);
  return { items: [...items, { label: "Retry buffer (15%)", usd: base * RETRY_BUFFER }], usd, credits: usdToCredits(usd, markup) };
}
