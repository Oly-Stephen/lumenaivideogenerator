"use client";

import { estimateProject } from "@lumen/core";
import { CaretDown, Check, DeviceMobile, Monitor, PenNib, Sparkle } from "@phosphor-icons/react";
import { useActionState, useMemo, useState } from "react";
import { Button, Credits, Field, inputCls, Segmented, Switch } from "@/components/ui";
import { createProject, type CreateState } from "./actions";

interface Props {
  voices: { id: string; name: string }[];
  presets: { key: string; name: string; blurb: string; swatch: string[] }[];
  maxDuration: number;
  balance: number;
  initialTopic: string;
}

type Format = "short_9x16" | "full_16x9";
type Quality = "budget" | "standard";
const MOTION_RES = process.env.NEXT_PUBLIC_TEST_MOTION_RES ?? "480P";
const LENGTHS = [15, 30, 60, 180, 600];

/** Rough pre-script estimate; the exact price is shown on the storyboard before anything is spent. */
function roughCredits(format: Format, quality: Quality, seconds: number, music: boolean): [number, number] {
  const n = Math.max(2, Math.round(seconds / (format === "short_9x16" ? 4.5 : 6)));
  const words = Math.round((seconds * 2.5) / n);
  const animated = quality === "budget" ? Math.max(1, Math.round(n * 0.3)) : n;
  const scenes = Array.from({ length: n }, (_, i) => ({ words, animate: i < animated }));
  const base = { scenes, quality, music, needsStyleFrame: true, needsCharacterSheets: true, motionRes: MOTION_RES } as const;
  const lo = estimateProject({ ...base, characters: 0 }).credits;
  const hi = estimateProject({ ...base, characters: 2 }).credits;
  const r = (x: number) => Math.max(5, Math.round(x / 5) * 5);
  return [r(lo * 0.85), r(hi * 1.15)];
}

const lengthLabel = (s: number) => (s < 60 ? `${s} sec` : `${s / 60} min`);

export function CreateForm({ voices, presets, maxDuration, balance, initialTopic }: Props) {
  const [state, action, pending] = useActionState<CreateState, FormData>(createProject, {});
  const [mode, setMode] = useState<"topic" | "script">("topic");
  const [text, setText] = useState(initialTopic);
  const [format, setFormat] = useState<Format>("short_9x16");
  const [seconds, setSeconds] = useState(Math.min(30, maxDuration));
  const [preset, setPreset] = useState(presets[0]?.key ?? "flat_editorial");
  const [voice, setVoice] = useState(voices[0]?.id ?? "");
  const [quality, setQuality] = useState<Quality>("budget");
  const [captions, setCaptions] = useState(true);
  const [music, setMusic] = useState(true);
  const [autopilot, setAutopilot] = useState(false);
  const [highWriting, setHighWriting] = useState(false);
  const [open, setOpen] = useState(false);

  const [lo, hi] = useMemo(() => roughCredits(format, quality, seconds, music), [format, quality, seconds, music]);
  const presetName = presets.find((p) => p.key === preset)?.name ?? "";
  const voiceName = voices.find((v) => v.id === voice)?.name ?? "";
  const summary = [quality === "budget" ? "Budget" : "Standard", presetName, voiceName, autopilot ? "Autopilot" : "Approvals on"].filter(Boolean).join(", ");
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <form action={action} className="mt-8">
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

      <div className="rounded-[20px] border border-line bg-surface p-2 shadow-float transition-shadow focus-within:ring-3 focus-within:ring-accent-soft">
        <div className="flex gap-1 p-1">
          {([["topic", "Topic", Sparkle], ["script", "My script", PenNib]] as const).map(([m, label, Icon]) => (
            <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}
              className={`press inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium ${mode === m ? "bg-surface-2 text-fg" : "text-muted hover:text-fg"}`}>
              <Icon size={14} aria-hidden /> {label}
            </button>
          ))}
        </div>
        <label htmlFor="input_text" className="sr-only">{mode === "topic" ? "What should the video explain?" : "Your narration script"}</label>
        <textarea id="input_text" name="input_text" required value={text} onChange={(e) => setText(e.target.value)}
          rows={mode === "topic" ? 3 : 10} maxLength={20000} autoFocus
          placeholder={mode === "topic" ? "What should the video explain?" : "Paste the narration, exactly as it should be spoken."}
          className="block w-full resize-none bg-transparent px-3 py-2 text-[17px] leading-relaxed placeholder:text-muted/70 focus:outline-none focus-visible:outline-none" />
        <div className="flex items-center justify-between px-3 pb-1.5 text-[12px] text-muted">
          <span>{mode === "script" && words > 0 ? `${words} words, about ${Math.round(words / 2.5)} sec narrated` : mode === "topic" ? "A question works well. Lumen researches it first." : ""}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Format">
          <Segmented label="Format" value={format} onChange={setFormat} options={[
            { value: "short_9x16", label: <span className="inline-flex items-center gap-1.5"><DeviceMobile size={15} aria-hidden /> Short 9:16</span> },
            { value: "full_16x9", label: <span className="inline-flex items-center gap-1.5"><Monitor size={15} aria-hidden /> Full 16:9</span> },
          ]} />
        </Field>
        <Field label="Length" helper={maxDuration < 600 ? `Test phase: up to ${lengthLabel(maxDuration)}.` : undefined}>
          <Segmented label="Length" size="sm" value={String(seconds)} onChange={(v) => setSeconds(Number(v))}
            options={LENGTHS.map((s) => ({ value: String(s), label: lengthLabel(s), disabled: s > maxDuration }))} />
        </Field>
      </div>

      <div className="mt-6 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="options"
          className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-surface-2/60">
          <span className="min-w-0">
            <span className="block text-sm font-medium">Options</span>
            <span className="block truncate text-[13px] text-muted">{summary}</span>
          </span>
          <CaretDown size={16} className={`shrink-0 text-muted transition-transform duration-300 ease-[var(--ease)] ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {open && (
          <div id="options" className="enter space-y-6 border-t border-line px-4 py-5">
            <Field label="Quality">
              <div className="grid gap-2 sm:grid-cols-2">
                {([
                  ["budget", "Budget", "A few key scenes move, the rest are stills with gentle camera motion."],
                  ["standard", "Standard", "Every scene is animated."],
                ] as const).map(([q, name, body]) => (
                  <button key={q} type="button" onClick={() => setQuality(q)} aria-pressed={quality === q}
                    className={`press relative rounded-[var(--radius-control)] border p-3 text-left ${quality === q ? "border-accent bg-accent-soft" : "border-line-strong hover:bg-surface-2"}`}>
                    <span className="block text-sm font-medium">{name}</span>
                    <span className="mt-0.5 block text-[13px] text-muted">{body}</span>
                    {quality === q && <Check size={15} weight="bold" className="absolute top-3 right-3 text-accent" aria-hidden />}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Visual style">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {presets.map((p) => (
                  <button type="button" key={p.key} onClick={() => setPreset(p.key)} aria-pressed={preset === p.key}
                    className={`press rounded-[var(--radius-control)] border p-2.5 text-left ${preset === p.key ? "border-accent bg-accent-soft" : "border-line-strong hover:bg-surface-2"}`}>
                    <span className="flex h-6 overflow-hidden rounded-[6px]">
                      {p.swatch.slice(0, 5).map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}
                    </span>
                    <span className="mt-2 block text-[13px] font-medium">{p.name}</span>
                    <span className="block text-[12px] leading-snug text-muted">{p.blurb.replace(/\s*[—–]\s*/g, ". ")}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Narrator" htmlFor="voice">
              <select id="voice" value={voice} onChange={(e) => setVoice(e.target.value)} className={inputCls}>
                {voices.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </Field>

            <div className="divide-y divide-line rounded-[var(--radius-control)] border border-line">
              {[
                { label: "Captions", body: "Word-by-word subtitles burned into the video.", on: captions, set: setCaptions },
                { label: "Music", body: "A quiet instrumental bed under the voice.", on: music, set: setMusic },
                { label: "Autopilot", body: "Skip the script and storyboard reviews. Credits are still held before generating.", on: autopilot, set: setAutopilot },
                { label: "High-quality writing", body: "Claude Opus writes the research, script and storyboard. About twice the writing cost.", on: highWriting, set: setHighWriting },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-4 px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="text-[13px] text-muted">{r.body}</p>
                  </div>
                  <Switch checked={r.on} onChange={r.set} label={r.label} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {state.error && <p role="alert" className="mt-4 text-sm text-danger">{state.error}</p>}

      <div className="material-bar fixed inset-x-0 bottom-0 z-20 border-t border-line">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="min-w-0 text-[13px] leading-tight">
            <p className="font-medium">About {lo === hi ? lo : `${lo} to ${hi}`} credits</p>
            <p className="text-muted">Exact price shown before generating. Balance <Credits n={balance} /></p>
          </div>
          <Button type="submit" size="lg" busy={pending} disabled={!text.trim()}>
            {pending ? "Starting" : autopilot ? "Generate video" : "Write script"}
          </Button>
        </div>
      </div>
    </form>
  );
}
