// FFmpeg / ffprobe helpers. Binaries come from ffmpeg-static / ffprobe-static (no system install).
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";

const require = createRequire(import.meta.url);
export const FFMPEG: string = process.env.FFMPEG_PATH || (require("ffmpeg-static") as string);
export const FFPROBE: string = process.env.FFPROBE_PATH || (require("ffprobe-static") as { path: string }).path;

const run = promisify(execFile);

export async function ffmpeg(args: string[], cwd?: string): Promise<void> {
  try {
    await run(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], { cwd, maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    const err = e as { stderr?: string; message: string };
    throw new Error(`ffmpeg failed: ${(err.stderr || err.message).slice(-1500)}`);
  }
}

/** Runs ffmpeg and returns stderr (for analysis filters that report there). */
export async function ffmpegStderr(args: string[]): Promise<{ stderr: string }> {
  const { stderr } = await run(FFMPEG, ["-hide_banner", "-nostats", "-y", ...args], { maxBuffer: 64 * 1024 * 1024 });
  return { stderr };
}

export interface Probe {
  durationMs: number;
  width?: number;
  height?: number;
  hasAudio: boolean;
}

export async function probe(path: string): Promise<Probe> {
  const { stdout } = await run(FFPROBE, ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", path]);
  const j = JSON.parse(stdout) as {
    format: { duration?: string };
    streams: { codec_type: string; width?: number; height?: number; duration?: string }[];
  };
  const v = j.streams.find((s) => s.codec_type === "video");
  const dur = Number(j.format.duration ?? v?.duration ?? 0);
  return {
    durationMs: Math.round(dur * 1000),
    width: v?.width,
    height: v?.height,
    hasAudio: j.streams.some((s) => s.codec_type === "audio"),
  };
}

// ---- mock media (PROVIDER_MODE=mock): deterministic placeholders, zero spend ----
const MOCK_COLORS = ["0x2A9D8F", "0xE76F51", "0xE9C46A", "0x264653", "0xF4A261", "0x8AB17D"];

export async function mockImage(out: string, w: number, h: number, seed: number): Promise<void> {
  const c = MOCK_COLORS[seed % MOCK_COLORS.length];
  await ffmpeg(["-f", "lavfi", "-i", `color=c=${c}:s=${w}x${h}`, "-frames:v", "1", out]);
}

export async function mockVideo(out: string, w: number, h: number, seconds: number, seed: number): Promise<void> {
  const c = MOCK_COLORS[seed % MOCK_COLORS.length];
  await ffmpeg(["-f", "lavfi", "-i", `color=c=${c}:s=${w}x${h}:r=24:d=${seconds}`, "-c:v", "libx264", "-pix_fmt", "yuv420p", out]);
}

export async function mockTone(out: string, seconds: number, freq = 220): Promise<void> {
  await ffmpeg(["-f", "lavfi", "-i", `sine=frequency=${freq}:duration=${seconds}`, "-af", "volume=0.2", out]);
}
