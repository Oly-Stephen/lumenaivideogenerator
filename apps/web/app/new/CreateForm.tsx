"use client";

import { useActionState, useState } from "react";
import { createProject, type CreateState } from "./actions";

interface Props {
  voices: { id: string; name: string }[];
  presets: { key: string; name: string; blurb: string; swatch: string[] }[];
  maxDuration: number;
}

const field = "w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export function CreateForm({ voices, presets, maxDuration }: Props) {
  const [state, action, pending] = useActionState<CreateState, FormData>(createProject, {});
  const [format, setFormat] = useState<"short_9x16" | "full_16x9">("short_9x16");
  const [mode, setMode] = useState<"topic" | "script">("topic");
  const [preset, setPreset] = useState(presets[0]?.key ?? "flat_editorial");

  return (
    <form action={action} className="mt-6 space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Format</legend>
        <div className="grid grid-cols-2 gap-2">
          {([["short_9x16", "Short", "9:16 · Reels, Shorts, TikTok"], ["full_16x9", "Full", "16:9 · YouTube"]] as const).map(([v, label, sub]) => (
            <label key={v} className={`cursor-pointer rounded-md border p-3 ${format === v ? "border-[color:var(--accent)]" : "border-black/15 dark:border-white/20"}`}>
              <input type="radio" name="format" value={v} checked={format === v} onChange={() => setFormat(v)} className="sr-only" />
              <span className="block font-medium">{label}</span>
              <span className="text-xs text-[color:var(--muted)]">{sub}</span>
            </label>
          ))}
        </div>
        {format === "full_16x9" && (
          <p className="mt-2 text-xs text-[color:var(--muted)]">Test phase: Full videos render at up to {maxDuration}s. Long-form (up to 10 min) arrives in M4.</p>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">What should the video explain?</legend>
        <div className="mb-2 flex gap-4 text-sm">
          {(["topic", "script"] as const).map((m) => (
            <label key={m} className="flex items-center gap-1">
              <input type="radio" name="input_mode" value={m} checked={mode === m} onChange={() => setMode(m)} />
              {m === "topic" ? "A topic" : "My own script"}
            </label>
          ))}
        </div>
        <textarea name="input_text" required rows={mode === "topic" ? 2 : 8} maxLength={20000} className={field}
          placeholder={mode === "topic" ? "e.g. Why do cats purr?" : "Paste your narration script…"} />
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Visual style</legend>
        <input type="hidden" name="style_preset" value={preset} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {presets.map((p) => (
            <button type="button" key={p.key} onClick={() => setPreset(p.key)}
              className={`rounded-md border p-2 text-left ${preset === p.key ? "border-[color:var(--accent)]" : "border-black/15 dark:border-white/20"}`}>
              <span className="flex gap-0.5">{p.swatch.slice(0, 5).map((c) => <span key={c} className="h-3 w-4 rounded-sm" style={{ background: c }} />)}</span>
              <span className="mt-1 block text-sm font-medium">{p.name}</span>
              <span className="block text-xs text-[color:var(--muted)]">{p.blurb}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Narrator</span>
          <select name="voice_id" required className={field}>
            {voices.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Length</span>
          <select name="target_duration_s" className={field} defaultValue={String(maxDuration)}>
            {[15, 30, 60, 180, 600].map((s) => (
              <option key={s} value={s} disabled={s > maxDuration}>
                {s < 60 ? `${s} seconds` : `${s / 60} min`}{s > maxDuration ? " (after test phase)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Quality</span>
          <select name="quality" className={field} defaultValue="budget">
            <option value="budget">Budget — still images with gentle motion (~$0.70 / 30s)</option>
            <option value="standard">Standard — every scene animated (~$2.80 / 30s)</option>
            <option value="premium" disabled>Premium — reference video model (M3)</option>
          </select>
        </label>
        <div className="flex items-end gap-4 text-sm">
          <label className="flex items-center gap-1"><input type="checkbox" name="subtitles" defaultChecked /> Captions</label>
          <label className="flex items-center gap-1"><input type="checkbox" name="music" defaultChecked /> Music</label>
        </div>
        <div className="space-y-2 text-sm sm:col-span-2">
          <label className="flex items-start gap-2">
            <input type="checkbox" name="autopilot" className="mt-1" />
            <span><span className="font-medium">Autopilot</span> — skip the script and plan reviews and generate straight away (credits are still held up front).</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="llm_tier" value="high" className="mt-1" />
            <span><span className="font-medium">High-quality writing</span> — use Claude Opus for research, script and plan (about 2× the writing cost; video cost unchanged).</span>
          </label>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-md bg-[color:var(--accent)] px-4 py-2 font-medium text-white disabled:opacity-60">
        {pending ? "Starting…" : "Generate"}
      </button>
    </form>
  );
}
