"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Scene } from "./types";

interface Estimate { items: { label: string; usd: number }[]; usd: number; credits: number }

export function PlanReview({ supabase, projectId, quality, estimate, estimateCredits, balance, scenes, characters, onChanged }: {
  supabase: SupabaseClient; projectId: string; quality: string; estimate: Estimate | null; estimateCredits: number | null;
  balance: number | null; scenes: Scene[]; characters: { id: string; name: string; description: string }[]; onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const recalculating = estimateCredits === null;
  const short = balance !== null && estimateCredits !== null && balance < estimateCredits;

  async function call(fn: string, args: Record<string, unknown>) {
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc(fn, args);
    setBusy(false);
    if (error) setErr(error.message); else onChanged();
  }

  return (
    <section className="mt-6 rounded-lg border border-black/10 p-4 dark:border-white/15">
      <h2 className="font-semibold">Review the plan</h2>
      <p className="mt-1 text-sm text-[color:var(--muted)]">Toggle motion per scene to trade cost for movement. Nothing is spent until you approve.</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span>Quality:</span>
        {(["budget", "standard"] as const).map((q) => (
          <button key={q} disabled={busy || quality === q} onClick={() => call("rpc_set_quality", { p_project: projectId, p_quality: q })}
            className={`rounded-md border px-3 py-1 ${quality === q ? "border-[color:var(--accent)] font-medium" : "border-black/15 dark:border-white/20"}`}>
            {q === "budget" ? "Budget (some motion)" : "Standard (all motion)"}
          </button>
        ))}
      </div>

      {characters.length > 0 && (
        <div className="mt-4 text-sm">
          <h3 className="font-medium">Characters</h3>
          <ul className="mt-1 space-y-1">{characters.map((c) => <li key={c.id}><span className="font-medium">{c.name}:</span> {c.description}</li>)}</ul>
        </div>
      )}

      <ol className="mt-4 space-y-2">
        {scenes.map((s) => (
          <li key={s.id} className="rounded-md border border-black/10 p-3 text-sm dark:border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">Scene {s.idx + 1} · {s.shot_type}</span>
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={s.animate} disabled={busy}
                  onChange={(e) => call("rpc_set_scene_animate", { p_scene: s.id, p_animate: e.target.checked })} />
                Animate
              </label>
            </div>
            <p className="mt-1">“{s.narration}”</p>
            <p className="mt-1 text-xs text-[color:var(--muted)]">{s.visual_prompt}</p>
          </li>
        ))}
      </ol>

      <div className="mt-4 rounded-md bg-black/5 p-3 text-sm dark:bg-white/5">
        <h3 className="font-medium">Estimated cost</h3>
        {recalculating || !estimate ? (
          <p className="mt-1 text-[color:var(--muted)]">Recalculating…</p>
        ) : (
          <>
            <ul className="mt-1 space-y-0.5">
              {estimate.items.map((i) => (
                <li key={i.label} className="flex justify-between gap-4"><span>{i.label}</span><span className="tabular-nums">{Math.ceil(i.usd * 100)} cr</span></li>
              ))}
            </ul>
            <p className="mt-2 flex justify-between border-t border-black/10 pt-2 font-medium dark:border-white/15">
              <span>Total (held now, unused part returned)</span><span className="tabular-nums">{estimateCredits} credits</span>
            </p>
            {balance !== null && <p className="mt-1 text-xs text-[color:var(--muted)]">Your balance: {balance} credits</p>}
          </>
        )}
      </div>

      {short && <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">Not enough credits for this plan — turn off motion on some scenes or switch to Budget.</p>}
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      <button onClick={() => call("rpc_approve_plan", { p_project: projectId })} disabled={busy || recalculating || short}
        className="mt-4 w-full rounded-md bg-[color:var(--accent)] px-4 py-2 font-medium text-white disabled:opacity-60">
        {busy ? "Working…" : `Approve & generate${estimateCredits ? ` · hold ${estimateCredits} credits` : ""}`}
      </button>
    </section>
  );
}
