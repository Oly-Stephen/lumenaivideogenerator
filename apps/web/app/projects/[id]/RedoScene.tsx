"use client";

import { estimateScene, type RedoWhat } from "@lumen/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Button, Field, inputCls, Segmented, Sheet, Switch, useToast } from "@/components/ui";
import type { Scene } from "./types";

const MOTION_RES = process.env.NEXT_PUBLIC_TEST_MOTION_RES ?? "480P";

/** Redo one scene: choose what to regenerate, optionally edit the prompt, see the price, confirm. */
export function RedoSheet({ supabase, scene, balance, thumb, onClose, onDone }: {
  supabase: SupabaseClient; scene: Scene; balance: number | null; thumb?: string; onClose: () => void; onDone: () => void;
}) {
  const toast = useToast();
  const [what, setWhat] = useState<RedoWhat>("keyframe");
  const [visual, setVisual] = useState(scene.visual_prompt);
  const [motion, setMotion] = useState(scene.motion_prompt ?? "");
  const [newSeed, setNewSeed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const words = scene.word_end - scene.word_start + 1;
  const cost = estimateScene({ words, animate: scene.animate }, what, MOTION_RES).credits;
  const short = balance !== null && balance < cost;

  async function go() {
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc("rpc_regenerate_scene", {
      p_scene: scene.id, p_what: what,
      p_visual_prompt: visual.trim() !== scene.visual_prompt ? visual.trim() : null,
      p_motion_prompt: motion.trim() !== (scene.motion_prompt ?? "") ? motion.trim() : null,
      p_new_seed: newSeed,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    toast(`Redoing scene ${scene.idx + 1}. The video updates when it is done.`);
    onClose();
    onDone();
  }

  return (
    <Sheet open onClose={onClose} title={`Redo scene ${scene.idx + 1}`}
      footer={
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] text-muted">{short ? <span className="text-danger">Not enough credits</span> : <>Balance {balance?.toLocaleString() ?? "..."}</>}</p>
          <Button onClick={go} busy={busy} disabled={short || (what !== "motion" && !visual.trim())}>Redo, {cost} credits</Button>
        </div>
      }>
      <div className="space-y-5">
        <div className="flex gap-3">
          {thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="h-24 w-auto shrink-0 rounded-[8px] object-cover ring-1 ring-line" />
          )}
          <p className="text-sm leading-snug text-muted">{scene.narration}</p>
        </div>

        {scene.animate && (
          <Field label="What to redo" helper={what === "keyframe" ? "A new image, then new motion from it." : "Keep the image, generate new motion."}>
            <Segmented label="What to redo" value={what === "both" ? "keyframe" : what} onChange={(v) => setWhat(v as RedoWhat)}
              options={[{ value: "keyframe", label: "Image and motion" }, { value: "motion", label: "Motion only" }]} />
          </Field>
        )}

        {what !== "motion" && (
          <Field label="Image description" htmlFor="redo-visual" helper="Describe what should be in the frame. Avoid words, numbers and dates.">
            <textarea id="redo-visual" rows={4} value={visual} onChange={(e) => setVisual(e.target.value)} className={inputCls} />
          </Field>
        )}
        {scene.animate && (
          <Field label="Motion" htmlFor="redo-motion">
            <input id="redo-motion" value={motion} onChange={(e) => setMotion(e.target.value)} placeholder="Slow push-in, leaves drift" className={inputCls} />
          </Field>
        )}

        <div className="flex items-center justify-between gap-4 rounded-[var(--radius-control)] bg-surface-2 px-3.5 py-3">
          <div>
            <p className="text-sm font-medium">New variation</p>
            <p className="text-[13px] text-muted">Off keeps the same seed, useful when only the wording changed.</p>
          </div>
          <Switch checked={newSeed} onChange={setNewSeed} label="New variation" />
        </div>
        {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      </div>
    </Sheet>
  );
}
