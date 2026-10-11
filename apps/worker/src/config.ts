import { r2ConfigFromEnv, type R2Config } from "../../../supabase/functions/_shared/r2.ts";

export type ProviderMode = "live" | "replay" | "mock";

function num(k: string, d: number): number {
  const v = process.env[k]?.replace(/s+#.*$/, "").trim();
  if (v === undefined || v === "") return d;
  const n = Number(v);
  // a cap that silently parses to NaN disables every budget check — refuse to start instead
  if (!Number.isFinite(n)) throw new Error(`env ${k} must be a number, got "${process.env[k]}"`);
  return n;
}
function str(k: string, d?: string): string {
  const v = process.env[k]?.replace(/\s+#.*$/, "").trim();
  if (v) return v;
  if (d !== undefined) return d;
  throw new Error(`missing env ${k}`);
}

export interface Config {
  databaseUrl: string;
  mode: ProviderMode;
  r2: R2Config;
  falKey: string;
  fishKey: string;
  fishModel: string;
  falMaxInflight: number;
  falTotalBudgetUsd: number;
  dailyBudgetUsd: number;
  endpoints: { image: string; imageT2I: string; video: string; videoFallback: string; music: string; stt: string };
  testMotionRes: string;
  tmpDir: string;
  fixturesDir: string;
}

export function loadConfig(): Config {
  const mode = str("PROVIDER_MODE", "replay") as ProviderMode;
  if (!["live", "replay", "mock"].includes(mode)) throw new Error(`bad PROVIDER_MODE ${mode}`);
  return {
    databaseUrl: str("DATABASE_URL"),
    mode,
    r2: r2ConfigFromEnv((k) => process.env[k]?.replace(/\s+#.*$/, "").trim() || undefined),
    falKey: str("FAL_KEY", ""),
    fishKey: str("FISH_API_KEY", ""),
    fishModel: str("FISH_MODEL", "s2.1-pro-free"),
    falMaxInflight: num("FAL_MAX_INFLIGHT", 2),
    falTotalBudgetUsd: num("FAL_TOTAL_BUDGET_USD", 9),
    dailyBudgetUsd: num("GLOBAL_DAILY_SPEND_USD", 3),
    endpoints: {
      image: str("IMAGE_ENDPOINT", "google/nano-banana-2.1/edit"),
      imageT2I: str("IMAGE_T2I_ENDPOINT", "google/nano-banana-2.1"),
      video: str("VIDEO_STANDARD_ENDPOINT", "minimax/h3/image-to-video"),
      videoFallback: str("VIDEO_STANDARD_FALLBACK", "alibaba/wan-3.0/image-to-video"),
      music: str("MUSIC_ENDPOINT", "fal-ai/stable-audio-3/medium/text-to-audio"),
      stt: str("STT_ENDPOINT", "fal-ai/elevenlabs/speech-to-text/scribe-v2"),
    },
    testMotionRes: str("TEST_MOTION_RES", "480P"),
    tmpDir: str("RENDER_TMP_DIR_LOCAL", process.platform === "win32" ? `${process.env.TEMP}\\lumen` : "/tmp/lumen"),
    fixturesDir: str("FIXTURES_DIR", "fixtures"),
  };
}
