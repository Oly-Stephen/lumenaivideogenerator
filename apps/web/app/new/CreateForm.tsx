"use client";

import { estimateProject } from "@lumen/core";
import {
  Books, CaretDown, Check, ClosedCaptioning, Clock, DeviceMobile, Lightning, Monitor, MusicNotes, PenNib, SlidersHorizontal,
  Sparkle, SquaresFour, UserSound,
} from "@phosphor-icons/react";
import { useActionState, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Switch } from "@/components/ui";
import { createProject, type CreateState } from "./actions";

interface Preset { key: string; name: string; blurb: string; swatch: string[]; image: string | null }
interface Props {
  voices: { id: string; name: string }[];
  presets: Preset[];
  maxDuration: number;
  balance: number;
  initialTopic: string;
  initialFormat?: "short_9x16" | "full_16x9";
}

type Format = "short_9x16" | "full_16x9";
type Quality = "budget" | "standard";
const MOTION_RES = process.env.NEXT_PUBLIC_TEST_MOTION_RES ?? "480P";
const LENGTHS = [15, 30, 60, 180, 600];
const SUGGESTIONS = ["Why do cats purr?", "How do black holes form?", "Why is the sky blue?", "How do vaccines work?"];

const lengthLabel = (s: number) => (s < 60 ? `${s} sec` : `${s / 60} min`);
const lengthShort = (s: number) => (s < 60 ? `${s}s` : `${s / 60} min`);
/** Display-only split of names stored as "Ethan — calm educator (male)". */
const splitVoice = (n: string) => {
  const [name, ...rest] = n.split(/\s*[—–-]\s+/);
  return { name: (name ?? "").trim(), desc: rest.join(", ").trim() };
};
const tidyBlurb = (b: string) => b.replace(/\s*[—–]\s*(\w)/g, (_, c: string) => `. ${c.toUpperCase()}`);

function sceneCount(format: Format, seconds: number) {
  return Math.max(2, Math.round(seconds / (format === "short_9x16" ? 4.5 : 6)));
}

/** Rough pre-script estimate; the exact price is shown on the storyboard before anything is spent. */
function roughCredits(format: Format, quality: Quality, seconds: number, music: boolean): [number, number] {
  const n = sceneCount(format, seconds);
  const words = Math.round((seconds * 2.5) / n);
  const animated = quality === "budget" ? Math.max(1, Math.round(n * 0.3)) : n;
  const scenes = Array.from({ length: n }, (_, i) => ({ words, animate: i < animated }));
  const base = { scenes, quality, music, needsStyleFrame: true, needsCharacterSheets: true, motionRes: MOTION_RES } as const;
  const lo = estimateProject({ ...base, characters: 0 }).credits;
  const hi = estimateProject({ ...base, characters: 2 }).credits;
  const r = (x: number) => Math.max(5, Math.round(x / 5) * 5);
  return [r(lo * 0.85), r(hi * 1.15)];
}

/** Style art: the real sample frame, or its palette as soft bands. */
function StyleArt({ p, className = "" }: { p: Preset; className?: string }) {
  if (p.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.image} alt="" className={`h-full w-full object-cover ${className}`} />;
  }
  const c = p.swatch;
  const at = (i: number) => c[i] ?? c[0];
  return <div aria-hidden className={`h-full w-full ${className}`} style={{ background: `linear-gradient(160deg, ${at(0)} 0 28%, ${at(1)} 28% 52%, ${at(2)} 52% 72%, ${at(3)} 72% 88%, ${at(4)} 88%)` }} />;
}

/** Setting chip inside the composer that opens a small panel (a bottom sheet on phones), like Midjourney's
 *  Imagine bar or Higgsfield's prompt bar. Closes on outside click, Escape, or after a choice. */
function Chip({ id, open, setOpen, icon, label, children, wide = false, align = "left" }: {
  id: string; open: string | null; setOpen: (v: string | null) => void; icon: ReactNode; label: ReactNode;
  children: ReactNode; wide?: boolean; align?: "left" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const isOpen = open === id;
  const [side, setSide] = useState<"left" | "right">(align);
  // Keep the panel on screen: flip to right-aligned when it would overflow the viewport (desktop only).
  useLayoutEffect(() => {
    if (!isOpen) { setSide(align); return; }
    const r = panel.current?.getBoundingClientRect();
    if (r && window.innerWidth >= 640 && r.right > window.innerWidth - 12) setSide("right");
  }, [isOpen, align]);
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [isOpen, setOpen]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(isOpen ? null : id)} aria-expanded={isOpen} aria-haspopup="dialog"
        className={`press inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap transition-colors ${isOpen ? "border-fg bg-fg text-bg" : "border-line-strong bg-surface text-fg hover:bg-surface-2"}`}>
        {icon}{label}<CaretDown size={11} weight="bold" className={`opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {isOpen && (
        <>
          <div aria-hidden className="fade fixed inset-0 z-30 bg-black/20 sm:hidden" onClick={() => setOpen(null)} />
          <div ref={panel} role="dialog" aria-label={id}
            className={`enter z-40 rounded-[18px] border border-line bg-surface p-2 shadow-[0_24px_60px_-20px_rgb(24_24_27/0.35)] max-sm:fixed max-sm:inset-x-3 max-sm:bottom-3 max-sm:max-h-[75dvh] max-sm:overflow-y-auto sm:absolute sm:top-[calc(100%+8px)] sm:max-h-[min(60vh,480px)] sm:overflow-y-auto ${side === "right" ? "sm:right-0" : "sm:left-0"} ${wide ? "sm:w-[440px]" : "sm:w-[300px]"}`}>
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function Option({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={`press flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left ${on ? "bg-surface-2" : "hover:bg-surface-2/60"}`}>
      <span className="min-w-0 flex-1">{children}</span>
      {on && <Check size={15} weight="bold" className="shrink-0 text-accent" aria-hidden />}
    </button>
  );
}

export function CreateForm({ voices, presets, maxDuration, balance, initialTopic, initialFormat = "short_9x16" }: Props) {
  const [state, action, pending] = useActionState<CreateState, FormData>(createProject, {});
  const [mode, setMode] = useState<"topic" | "script">("topic");
  const [text, setText] = useState(initialTopic);
  const [format, setFormat] = useState<Format>(initialFormat);
  const [seconds, setSeconds] = useState(Math.min(30, maxDuration));
  const [preset, setPreset] = useState(presets.find((p) => p.image)?.key ?? presets[0]?.key ?? "flat_editorial");
  const [voice, setVoice] = useState(voices[0]?.id ?? "");
  const [quality, setQuality] = useState<Quality>("budget");
  const [captions, setCaptions] = useState(true);
  const [music, setMusic] = useState(true);
  const [autopilot, setAutopilot] = useState(false);
  const [highWriting, setHighWriting] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const [lo, hi] = useMemo(() => roughCredits(format, quality, seconds, music), [format, quality, seconds, music]);
  const budgetRange = useMemo(() => roughCredits(format, "budget", seconds, music), [format, seconds, music]);
  const standardRange = useMemo(() => roughCredits(format, "standard", seconds, music), [format, seconds, music]);
  const style = presets.find((p) => p.key === preset) ?? presets[0]!;
  const narrator = splitVoice(voices.find((v) => v.id === voice)?.name ?? "");
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const scenes = sceneCount(format, seconds);
  const vertical = format === "short_9x16";
  const short = balance < lo;
  const extrasOn = [captions, music, autopilot, highWriting].filter(Boolean).length;
  const choose = <T,>(set: (v: T) => void) => (v: T) => { set(v); setOpen(null); };

  const outline = [
    { icon: Books, label: mode === "topic" ? "Researched script with sources" : "Your script, timed to the voice" },
    { icon: SquaresFour, label: `About ${scenes} scenes` },
    { icon: UserSound, label: `Narrated by ${narrator.name || "your narrator"}` },
    { icon: Lightning, label: quality === "budget" ? "Key scenes animated" : "Every scene animated" },
    ...(music ? [{ icon: MusicNotes, label: "Music bed" }] : []),
    ...(captions ? [{ icon: ClosedCaptioning, label: "Captions" }] : []),
  ];

  return (
    <form action={action} className="dots min-h-dvh">
      <input type="hidden" name="input_mode" value={mode} />
      <input type="hidden" name="format" value={format} />
      <input type="hidden" name="target_duration_s" value={seconds} />
      <input type="hidden" name="style_preset" value={preset} />
      <input type="hidden" name="voice_id" value={voice} />
      <input type="hidden" name="quality" value={quality} />
      {captions && <input type="hidden" name="subtitles" value="on" />}
      {music && <input type="hidden" name="music" value="on" />}
      {autopilot && <input type="hidden" name="autopilot" value="on" />}
      {highWriting && <input type="hidden" name="llm_tier" value="high" />}

      <div className="mx-auto w-full max-w-[860px] px-4 pt-10 pb-20 sm:px-8 lg:pt-[9vh]">
        <div className="enter text-center">
          <h1 className="text-[clamp(1.9rem,4vw,2.75rem)] leading-tight font-semibold tracking-[-0.035em]">What should we explain?</h1>
          <p className="mx-auto mt-2 max-w-[52ch] text-[15px] text-balance text-muted">Ask a question or paste a script. You review the script and storyboard, with the price, before any video is generated.</p>
        </div>

        {/* ---------- composer ---------- */}
        <div className="enter relative z-20 mt-8 rounded-[26px] border border-line-strong bg-surface p-2 shadow-[0_1px_2px_rgb(24_24_27/0.04),0_28px_70px_-30px_rgb(24_24_27/0.35)] transition-shadow focus-within:border-accent/40 focus-within:ring-4 focus-within:ring-accent-soft" style={{ animationDelay: "40ms" }}>
          <div className="flex items-center gap-1 px-1 pt-1">
            {([["topic", "Topic", Sparkle], ["script", "My script", PenNib]] as const).map(([m, label, Icon]) => (
              <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}
                className={`press inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium ${mode === m ? "bg-surface-2 text-fg" : "text-muted hover:text-fg"}`}>
                <Icon size={14} aria-hidden /> {label}
              </button>
            ))}
            {mode === "script" && words > 0 && <span className="ml-auto pr-3 text-[12px] text-muted tabular-nums">{words} words, about {Math.round(words / 2.5)} sec</span>}
          </div>

          <label htmlFor="input_text" className="sr-only">{mode === "topic" ? "What should the video explain?" : "Your narration script"}</label>
          <textarea id="input_text" name="input_text" required value={text} onChange={(e) => setText(e.target.value)}
            rows={mode === "topic" ? 3 : 9} maxLength={20000} autoFocus
            placeholder={mode === "topic" ? "Why do cats purr? How do vaccines work? Ask anything." : "Paste the narration exactly as it should be spoken."}
            className="block w-full resize-none bg-transparent px-4 py-3 text-[19px] leading-relaxed placeholder:text-muted/60 focus:outline-none focus-visible:outline-none" />

          {/* settings chips + generate */}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-2 pt-2.5 pb-1">
            <Chip id="Format" open={open} setOpen={setOpen}
              icon={vertical ? <DeviceMobile size={15} aria-hidden /> : <Monitor size={15} aria-hidden />}
              label={vertical ? "Short 9:16" : "Full 16:9"}>
              <div className="grid grid-cols-2 gap-2 p-1">
                {([["short_9x16", "Short", "9:16", "Shorts, Reels, TikTok", "h-10 w-6"], ["full_16x9", "Full", "16:9", "YouTube", "h-6 w-10"]] as const).map(([v, name, ratio, sub, shape]) => (
                  <button key={v} type="button" onClick={() => choose(setFormat)(v)} aria-pressed={format === v}
                    className={`press flex flex-col items-center gap-2 rounded-[14px] border p-4 ${format === v ? "border-fg bg-surface-2" : "border-line hover:bg-surface-2/60"}`}>
                    <span className="flex h-11 items-center"><span aria-hidden className={`rounded-[5px] border-2 ${format === v ? "border-fg" : "border-muted/60"} ${shape}`} /></span>
                    <span className="text-[14px] font-semibold">{name} <span className="font-normal text-muted">{ratio}</span></span>
                    <span className="text-[12px] text-muted">{sub}</span>
                  </button>
                ))}
              </div>
            </Chip>

            <Chip id="Length" open={open} setOpen={setOpen} icon={<Clock size={15} aria-hidden />} label={lengthShort(seconds)}>
              {LENGTHS.map((s) => (
                <Option key={s} on={s === seconds} onClick={() => s <= maxDuration && choose(setSeconds)(s)}>
                  <span className={`flex items-center justify-between gap-3 text-[14px] ${s > maxDuration ? "opacity-40" : ""}`}>
                    <span className="font-medium">{lengthLabel(s)}</span>
                    {s > maxDuration && <span className="text-[12px] text-muted">After test phase</span>}
                  </span>
                </Option>
              ))}
            </Chip>

            <Chip id="Style" open={open} setOpen={setOpen} wide
              icon={<span aria-hidden className="h-5 w-5 overflow-hidden rounded-[6px] ring-1 ring-line"><StyleArt p={style} /></span>}
              label={style.name}>
              <div className="grid grid-cols-3 gap-2 p-1">
                {presets.map((p) => (
                  <button key={p.key} type="button" onClick={() => choose(setPreset)(p.key)} aria-pressed={p.key === preset} title={tidyBlurb(p.blurb)}
                    className={`press group relative aspect-[3/4] overflow-hidden rounded-[12px] text-left ${p.key === preset ? "ring-2 ring-accent" : "ring-1 ring-line"}`}>
                    <StyleArt p={p} className="transition-transform duration-500 group-hover:scale-[1.05]" />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pt-6 pb-1.5 text-[11px] font-semibold text-white">{p.name}</span>
                  </button>
                ))}
              </div>
            </Chip>

            <Chip id="Narrator" open={open} setOpen={setOpen}
              icon={<span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-fg/90 text-[10px] font-semibold text-bg">{narrator.name.slice(0, 1)}</span>}
              label={narrator.name || "Narrator"}>
              {voices.map((v) => {
                const { name, desc } = splitVoice(v.name);
                return (
                  <Option key={v.id} on={v.id === voice} onClick={() => choose(setVoice)(v.id)}>
                    <span className="flex items-center gap-3">
                      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[12px] font-semibold">{name.slice(0, 1)}</span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium">{name}</span>
                        {desc && <span className="block truncate text-[12px] text-muted">{desc}</span>}
                      </span>
                    </span>
                  </Option>
                );
              })}
            </Chip>

            <Chip id="Quality" open={open} setOpen={setOpen} icon={<Lightning size={15} aria-hidden />} label={quality === "budget" ? "Budget" : "Standard"}>
              {([
                ["budget", "Budget", "Key scenes animated, the rest get camera moves", budgetRange],
                ["standard", "Standard", "Every scene animated", standardRange],
              ] as const).map(([q, name, body, range]) => (
                <Option key={q} on={quality === q} onClick={() => choose(setQuality)(q)}>
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-[14px] font-semibold">{name}</span>
                      <span className="block text-[12px] text-muted">{body}</span>
                    </span>
                    <span className="shrink-0 pt-0.5 text-[12px] text-muted tabular-nums">{range[0]} to {range[1]}</span>
                  </span>
                </Option>
              ))}
            </Chip>

            <Chip id="More" open={open} setOpen={setOpen} icon={<SlidersHorizontal size={15} aria-hidden />}
              label={<span className="flex items-center gap-1">More<span className="rounded-full bg-surface-2 px-1.5 text-[11px] text-muted tabular-nums">{extrasOn}</span></span>}>
              <div className="space-y-3 p-2">
                {[
                  { label: "Captions", body: "Word-by-word subtitles", on: captions, set: setCaptions },
                  { label: "Music", body: "Instrumental bed under the voice", on: music, set: setMusic },
                  { label: "Autopilot", body: "Skip the script and storyboard reviews", on: autopilot, set: setAutopilot },
                  { label: "Pro writing", body: "Claude Opus writes the script", on: highWriting, set: setHighWriting },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium">{r.label}</p>
                      <p className="text-[12px] text-muted">{r.body}</p>
                    </div>
                    <Switch checked={r.on} onChange={r.set} label={r.label} />
                  </div>
                ))}
              </div>
            </Chip>

            <div className="ml-auto flex items-center gap-3 max-sm:mt-1 max-sm:w-full max-sm:justify-between">
              <span className="text-right text-[12px] leading-tight">
                <span className="block font-semibold tabular-nums">~{lo === hi ? lo : `${lo}-${hi}`} credits</span>
                <span className={`block tabular-nums ${short ? "text-warning" : "text-muted"}`}>{short ? "Low balance" : `Balance ${balance.toLocaleString()}`}</span>
              </span>
              <button type="submit" disabled={pending || !text.trim()}
                className="press inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-accent px-5 text-[15px] font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-40">
                <Sparkle size={16} weight="fill" aria-hidden />
                {pending ? "Starting" : autopilot ? "Generate" : "Write script"}
              </button>
            </div>
          </div>
        </div>

        {state.error && <p role="alert" className="mt-4 rounded-[12px] bg-danger-soft px-4 py-3 text-sm text-danger">{state.error}</p>}

        {mode === "topic" && !text.trim() && (
          <div className="enter mt-4 flex flex-wrap justify-center gap-2" style={{ animationDelay: "80ms" }}>
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setText(s)}
                className="press rounded-full border border-line bg-surface/80 px-3.5 py-1.5 text-[13px] text-muted backdrop-blur-sm hover:border-line-strong hover:text-fg">{s}</button>
            ))}
          </div>
        )}

        {/* what you'll get */}
        <ul className="enter mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2" style={{ animationDelay: "100ms" }}>
          {outline.map((o) => (
            <li key={o.label} className="flex items-center gap-1.5 text-[13px] text-muted">
              <o.icon size={15} className="text-accent" aria-hidden /> {o.label}
            </li>
          ))}
        </ul>

        {/* style strip */}
        <section className="enter mt-14" style={{ animationDelay: "140ms" }} aria-label="Styles">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[17px] font-semibold tracking-[-0.01em]">Choose a look</h2>
              <p className="text-[13px] text-muted">Every scene keeps the same style and characters.</p>
            </div>
            <span className="text-[13px] text-muted">{vertical ? "Short 9:16" : "Full 16:9"}, {lengthLabel(seconds)}</span>
          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-6 sm:overflow-visible sm:px-0">
            {presets.map((p) => {
              const on = p.key === preset;
              return (
                <button key={p.key} type="button" onClick={() => setPreset(p.key)} aria-pressed={on} title={tidyBlurb(p.blurb)}
                  className={`press group relative aspect-[3/4] w-[132px] shrink-0 overflow-hidden rounded-[16px] text-left ring-offset-2 ring-offset-canvas sm:w-auto ${on ? "ring-2 ring-accent" : "ring-1 ring-line hover:ring-line-strong"}`}>
                  <StyleArt p={p} className="transition-transform duration-500 ease-[var(--ease)] group-hover:scale-[1.05]" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-2.5 pt-8 pb-2 text-[12px] font-semibold text-white">{p.name}</span>
                  {on && <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-on-accent"><Check size={11} weight="bold" aria-hidden /></span>}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </form>
  );
}
