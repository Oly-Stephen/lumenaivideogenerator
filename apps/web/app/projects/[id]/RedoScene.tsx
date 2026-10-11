"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { estimateScene, type RedoWhat } from "@lumen/core";
import type { Scene } from "./types";

const MOTION_RES = process.env.NEXT_PUBLIC_TEST_MOTION_RES ?? "480P";

export function RedoScene({ supabase, scene, balance, onDone }: { supabase: SupabaseClient; scene: Scene; balance: number | null; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [what, setWhat] = useState<RedoWhat>(scene.animate ? "both" : "keyframe");
  const [visual, setVisual] = useState(scene.visual_prompt);
  const [motion, setMotion] = useState(scene.motion_prompt ?? "");
  const [newSeed, setNewSeed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cost = estimateScene({ words: scene.word_end - scene.word_start + 1, animate: scene.animate }, what, MOTION_RES).credits;
  const short = balance !== null && balance < cost;

  async function go() {
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc("rpc_regenerate_scene", {
      p_scene: scene.id, p_what: what,
      p_visual_prompt: visual !== scene.visual_prompt ? visual : null,
      p_motion_prompt: motion !== (scene.motion_prompt ?? "") ? motion : null,
      p_new_seed: newSeed,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setOpen(false);
    onDone();
  }

  if (!open) return <button onClick={() => setOpen(true)} className="mt-2 text-xs underline">Redo scene…</button>;
  return (
    <div className="mt-2 space-y-2 rounded-md border border-black/10 p-2 text-xs dark:border-white/15">
      <div className="flex flex-wrap gap-2">
        {(["keyframe", "motion", "both"] as const).filter((w) => scene.animate || w === "keyframe").map((w) => (
          <label key={w} className="flex items-center gap-1">
            <input type="radio" checked={what === w} onChange={() => setWhat(w)} />
            {w === "keyframe" ? (scene.animate ? "New image (+ motion)" : "New image") : w === "motion" ? "New motion only" : "Both"}
          </label>
        ))}
      </div>
      {what !== "motion" && (
        <textarea value={visual} onChange={(e) => setVisual(e.target.value)} rows={3} className="w-full rounded border border-black/15 bg-transparent p-1 dark:border-white/20" />
      )}
      {scene.animate && (
        <input value={motion} onChange={(e) => setMotion(e.target.value)} placeholder="Motion (camera / subject)" className="w-full rounded border border-black/15 bg-transparent p-1 dark:border-white/20" />
      )}
      <label className="flex items-center gap-1"><input type="checkbox" checked={newSeed} onChange={(e) => setNewSeed(e.target.checked)} /> New variation (new seed)</label>
      {err && <p className="text-red-600">{err}</p>}
      <div className="flex gap-2">
        <button onClick={go} disabled={busy || short} className="rounded bg-[color:var(--accent)] px-2 py-1 font-medium text-white disabled:opacity-60">
          {busy ? "…" : `Redo · ~${cost} credits`}
        </button>
        <button onClick={() => setOpen(false)} className="underline">Cancel</button>
      </div>
      {short && <p className="text-amber-700 dark:text-amber-300">Not enough credits.</p>}
    </div>
  );
}
