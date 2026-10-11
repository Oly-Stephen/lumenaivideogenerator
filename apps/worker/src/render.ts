// Final assembly (docs/03 §6): normalize scenes → crossfade chain → captions → ducked music → loudnorm.
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fitClip, type AlignedWord } from "@lumen/core";
import { ffmpeg, ffmpegStderr, probe } from "./media.ts";

export const XFADE_S = 0.3;
const FPS = 30;

export interface RenderScene {
  path: string; // local file (clip mp4 or keyframe png)
  type: "clip" | "kenburns";
  durMs: number; // on-timeline duration from alignment
  seed: number; // picks the Ken Burns direction
}

export interface RenderInput {
  workdir: string;
  width: number;
  height: number;
  scenes: RenderScene[];
  narrationPath: string;
  musicPath: string | null;
  words: AlignedWord[] | null; // null = no captions
  captionStyle: "pop_word" | "phrase";
  outPath: string;
}

export interface Edl {
  aspect: string;
  w: number;
  h: number;
  fps: number;
  transitions: { type: "fade"; ms: number };
  scenes: { idx: number; type: string; dur_ms: number; fit?: string }[];
  captions: string | null;
  music: boolean;
  loudness: { target_lufs: number; true_peak: number };
}

const KB_MOVES = [
  { z0: 1.0, z1: 1.12, x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)" }, // centered push-in
  { z0: 1.12, z1: 1.0, x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)" }, // pull-out
  { z0: 1.1, z1: 1.1, x: "(iw-iw/zoom)*on/{N}", y: "ih/2-(ih/zoom/2)" }, // pan left→right
  { z0: 1.1, z1: 1.1, x: "(iw-iw/zoom)*(1-on/{N})", y: "ih/2-(ih/zoom/2)" }, // pan right→left
];

async function normalizeScene(s: RenderScene, i: number, last: boolean, w: number, h: number, workdir: string): Promise<{ file: string; fit: string }> {
  const segS = s.durMs / 1000 + (last ? 0 : XFADE_S);
  const out = join(workdir, `seg_${String(i).padStart(3, "0")}.mp4`);
  const cover = `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1`;

  if (s.type === "kenburns") {
    const frames = Math.round(segS * FPS);
    const m = KB_MOVES[s.seed % KB_MOVES.length]!;
    const z = `${m.z0}+(${m.z1 - m.z0})*on/${frames}`;
    // render at 2x then downscale: removes zoompan's integer-step jitter
    const vf = `scale=${w * 2}:${h * 2}:force_original_aspect_ratio=increase,crop=${w * 2}:${h * 2},` +
      `zoompan=z='${z}':x='${m.x.replaceAll("{N}", String(frames))}':y='${m.y}':d=${frames}:s=${w * 2}x${h * 2}:fps=${FPS},` +
      `scale=${w}:${h},setsar=1,format=yuv420p`;
    await ffmpeg(["-loop", "1", "-i", s.path, "-vf", vf, "-frames:v", String(frames), "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", out]);
    return { file: out, fit: "kenburns" };
  }

  const clipMs = (await probe(s.path)).durationMs;
  const f = fitClip(clipMs, segS * 1000);
  let retime = "";
  if (f.mode === "slow") retime = `,setpts=${f.factor.toFixed(4)}*PTS`;
  if (f.mode === "hold") retime = `,tpad=stop_mode=clone:stop_duration=${((segS * 1000 - clipMs) / 1000).toFixed(3)}`;
  await ffmpeg(["-i", s.path, "-vf", `${cover},fps=${FPS}${retime},format=yuv420p`, "-t", segS.toFixed(3), "-an",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", out]);
  return { file: out, fit: f.mode };
}

// ---- loudness: EBU R128 two-pass (single-pass undershoots on short, dynamic mixes) ----
const TARGET = { I: -14, TP: -1.0, LRA: 11 };

export async function loudnorm2pass(src: string, out: string): Promise<void> {
  const { stderr } = await ffmpegStderr(["-i", src, "-vn", "-af", `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}:print_format=json`, "-f", "null", "-"]);
  const m = stderr.match(/\{[\s\S]*"input_i"[\s\S]*?\}/);
  if (!m) throw new Error("loudnorm measurement failed");
  const s = JSON.parse(m[0]) as Record<string, string>;
  const af = `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}:measured_I=${s.input_i}:measured_TP=${s.input_tp}:measured_LRA=${s.input_lra}:measured_thresh=${s.input_thresh}:offset=${s.target_offset}:linear=true,aresample=48000`;
  await ffmpeg(["-i", src, "-map", "0:v", "-map", "0:a", "-c:v", "copy", "-af", af, "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", out]);
}

// ---- captions (ASS) ----
function assTime(ms: number): string {
  const cs = Math.max(0, Math.round(ms / 10));
  const h = Math.floor(cs / 360000), m = Math.floor((cs % 360000) / 6000), s = Math.floor((cs % 6000) / 100), c = cs % 100;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
}
const esc = (t: string) => t.replace(/[{}\\]/g, "");

export function buildAss(words: AlignedWord[], w: number, h: number, style: "pop_word" | "phrase"): string {
  const vertical = h > w;
  const size = vertical ? Math.round(w * 0.075) : Math.round(h * 0.055);
  const marginV = vertical ? Math.round(h * 0.3) : Math.round(h * 0.08);
  const header = [
    "[Script Info]", "ScriptType: v4.00+", `PlayResX: ${w}`, `PlayResY: ${h}`, "WrapStyle: 2", "ScaledBorderAndShadow: yes", "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Cap,Arial,${size},&H00FFFFFF,&H00FFFFFF,&H00241A12,&H64000000,-1,0,0,0,100,100,0,0,1,${Math.round(size * 0.09)},0,2,60,60,${marginV},1`,
    "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  // group words: ≤3 (pop) / ≤7 (phrase) words, break after sentence punctuation
  const maxWords = style === "pop_word" ? 3 : 7;
  const groups: AlignedWord[][] = [];
  let cur: AlignedWord[] = [];
  for (const wd of words) {
    cur.push(wd);
    if (cur.length >= maxWords || /[.!?]$/.test(wd.text)) { groups.push(cur); cur = []; }
  }
  if (cur.length) groups.push(cur);

  const HIGHLIGHT = "&H006AC4E9&"; // #E9C46A in ASS BGR
  const events: string[] = [];
  groups.forEach((g, gi) => {
    const groupEnd = gi + 1 < groups.length ? groups[gi + 1]![0]!.startMs : g.at(-1)!.endMs + 400;
    if (style === "phrase") {
      events.push(`Dialogue: 0,${assTime(g[0]!.startMs)},${assTime(groupEnd)},Cap,,0,0,0,,${g.map((x) => esc(x.text)).join(" ")}`);
      return;
    }
    g.forEach((wd, wi) => {
      const start = wd.startMs;
      const end = wi + 1 < g.length ? g[wi + 1]!.startMs : groupEnd;
      const text = g.map((x, k) => (k === wi ? `{\\c${HIGHLIGHT}\\fscx108\\fscy108}${esc(x.text).toUpperCase()}{\\r}` : esc(x.text).toUpperCase())).join(" ");
      events.push(`Dialogue: 0,${assTime(start)},${assTime(Math.max(end, start + 80))},Cap,,0,0,0,,${text}`);
    });
  });
  return [...header, ...events, ""].join("\n");
}

export async function render(input: RenderInput): Promise<Edl> {
  const { workdir, width: w, height: h, scenes } = input;
  const segs: { file: string; fit: string }[] = [];
  for (let i = 0; i < scenes.length; i++) segs.push(await normalizeScene(scenes[i]!, i, i === scenes.length - 1, w, h, workdir));

  const totalS = scenes.reduce((a, s) => a + s.durMs, 0) / 1000;
  const args: string[] = [];
  segs.forEach((s) => args.push("-i", s.file));
  const narIdx = segs.length;
  args.push("-i", input.narrationPath);
  const musIdx = input.musicPath ? narIdx + 1 : -1;
  if (input.musicPath) args.push("-stream_loop", "-1", "-i", input.musicPath);

  // video: xfade chain; offset k = sum of on-timeline durations before k
  const f: string[] = [];
  let prev = "[0:v]";
  let offset = 0;
  for (let k = 1; k < segs.length; k++) {
    offset += scenes[k - 1]!.durMs / 1000;
    const label = `[x${k}]`;
    f.push(`${prev}[${k}:v]xfade=transition=fade:duration=${XFADE_S}:offset=${offset.toFixed(3)}${label}`);
    prev = label;
  }
  let captions: string | null = null;
  if (input.words?.length) {
    captions = "captions.ass";
    await writeFile(join(workdir, captions), buildAss(input.words, w, h, input.captionStyle), "utf8");
    f.push(`${prev}ass=${captions}[vout]`);
  } else {
    f.push(`${prev}null[vout]`);
  }

  // audio: narration (+ music ducked under it), loudness normalized for YouTube (-14 LUFS)
  if (musIdx >= 0) {
    f.push(`[${narIdx}:a]aresample=48000,apad=whole_dur=${totalS.toFixed(3)},asplit=2[nar][key]`);
    f.push(`[${musIdx}:a]aresample=48000,atrim=0:${totalS.toFixed(3)},volume=0.32,afade=t=in:d=1,afade=t=out:st=${Math.max(0, totalS - 1.5).toFixed(3)}:d=1.5[mus]`);
    f.push(`[mus][key]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[duck]`);
    f.push(`[nar][duck]amix=inputs=2:normalize=0:duration=first[aout]`);
  } else {
    f.push(`[${narIdx}:a]aresample=48000,apad=whole_dur=${totalS.toFixed(3)}[aout]`);
  }

  const premix = join(workdir, "premix.mkv");
  await ffmpeg([...args, "-filter_complex", f.join(";"), "-map", "[vout]", "-map", "[aout]", "-t", totalS.toFixed(3),
    "-c:v", "libx264", "-profile:v", "high", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-c:a", "pcm_s16le", "-ar", "48000", premix], workdir);
  await loudnorm2pass(premix, input.outPath);

  return {
    aspect: h > w ? "9:16" : "16:9", w, h, fps: FPS,
    transitions: { type: "fade", ms: XFADE_S * 1000 },
    scenes: scenes.map((s, i) => ({ idx: i, type: s.type, dur_ms: s.durMs, fit: segs[i]!.fit })),
    captions, music: musIdx >= 0,
    loudness: { target_lufs: -14, true_peak: -1 },
  };
}
