// List prices captured 2026-10-11 (docs/02 §2, §7). Re-verify with fal's pricing API before launch.

export type PriceRule =
  | { kind: "per_image"; usd: number }
  | { kind: "per_second"; usd: Record<string, number> } // by resolution
  | { kind: "per_minute"; usd: number }
  | { kind: "per_1k_chars"; usd: number }
  | { kind: "free" };

export const PRICES: Record<string, PriceRule> = {
  "google/nano-banana-2.1": { kind: "per_image", usd: 0.045 },
  "google/nano-banana-2.1/edit": { kind: "per_image", usd: 0.045 }, // 1K; 2K ≈ 0.063
  "minimax/h3/image-to-video": { kind: "per_second", usd: { "480P": 0.05, "768P": 0.06, "2K": 0.13, "4K": 0.16 } },
  "alibaba/wan-3.0/image-to-video": { kind: "per_second", usd: { "480p": 0.05, "720p": 0.1, "1080p": 0.2 } },
  "google/gemini-omni-flash/v1.1/reference-to-video": { kind: "per_second", usd: { "360p": 0.03, "720p": 0.1, "1080p": 0.15, "4k": 0.3 } },
  "minimax/music-3": { kind: "per_second", usd: { default: 0.002 } },
  "fal-ai/stable-audio-3/medium/text-to-audio": { kind: "per_image", usd: 0.0376 }, // per generation (≤380 s)
  "elevenlabs/music/v2.5": { kind: "per_minute", usd: 0.6 },
  "fal-ai/elevenlabs/speech-to-text/scribe-v2": { kind: "per_minute", usd: 0.008 },
  "fish:s2.1-pro-free": { kind: "free" },
  "fish:s2.1-pro": { kind: "per_1k_chars", usd: 0.015 },
};

export interface CostInput {
  endpoint: string;
  images?: number;
  seconds?: number;
  resolution?: string;
  chars?: number;
}

export function estimateUsd(c: CostInput): number {
  const rule = PRICES[c.endpoint];
  if (!rule) throw new Error(`no price for ${c.endpoint}`);
  switch (rule.kind) {
    case "free":
      return 0;
    case "per_image":
      return rule.usd * (c.images ?? 1);
    case "per_1k_chars":
      return (rule.usd * (c.chars ?? 0)) / 1000;
    case "per_minute":
      return rule.usd * Math.ceil((c.seconds ?? 0) / 60);
    case "per_second": {
      const r = c.resolution && rule.usd[c.resolution] !== undefined ? rule.usd[c.resolution]! : Object.values(rule.usd)[0]!;
      return r * (c.seconds ?? 0);
    }
  }
}

/** 1 credit = $0.01 × markup (docs/03 §9.2). */
export function usdToCredits(usd: number, markup = 1): number {
  return Math.ceil(usd * 100 * markup);
}
