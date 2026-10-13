"use client";

import { estimateScene } from "@lumen/core";
import { CaretUp, Info, UserCircle } from "@phosphor-icons/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useState } from "react";
import { Button, Credits, Segmented, Skeleton, Switch } from "@/components/ui";
import type { Scene } from "./types";

interface Estimate { items: { label: string; usd: number }[]; usd: number; credits: number }
const MOTION_RES = process.env.NEXT_PUBLIC_TEST_MOTION_RES ?? "480P";

export function PlanReview({ supabase, projectId, quality, estimate, estimateCredits, balance, scenes, characters, onChanged }: {
  supabase: SupabaseClient; projectId: string; quality: string; estimate: Estimate | null; estimateCredits: number | null;
  balance: number | null; scenes: Scene[]; characters: { id: string; name: string; description: string }[]; onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [costOpen, setCostOpen] = useState(false);
  const recalculating = estimateCredits === null;
  const shortBy = balance !== null && estimateCredits !== null ? estimateCredits - balance : 0;
  const short = shortBy > 0;

  async function call(key: string, fn: string, args: Record<string, unknown>) {
    setBusy(key); setErr(null);
    const { error } = await supabase.rpc(fn, args);
    setBusy(null);
    if (error) setErr(error.message); else onChanged();
  }

  const approve = (
    <Button size="lg" className="w-full" onClick={() => call("approve", "rpc_approve_plan", { p_project: projectId })}
      disabled={busy !== null || recalculating || short} busy={busy === "approve"}>
      {recalculating ? "Updating price" : `Generate video, ${estimateCredits} credits`}
    </Button>
  );

  const costPanel = (
    <div className="space-y-4">
      <Segmented label="Quality" size="sm" value={quality} disabled={busy !== null}
        onChange={(q) => call("quality", "rpc_set_quality", { p_project: projectId, p_quality: q })}
        options={[{ value: "budget", label: "Budget" }, { value: "standard", label: "Standard" }]} />
      {recalculating || !estimate ? (
        <div className="space-y-2.5" aria-label="Updating price">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-4" />)}
        </div>
      ) : (
        <dl className="space-y-2 text-sm">
          {estimate.items.map((i) => (
            <div key={i.label} className="flex justify-between gap-4">
              <dt className="text-muted">{i.label.replace(" @ ", " at ")}</dt>
              <dd className="tabular-nums">{Math.ceil(i.usd * 100)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t border-line pt-2.5 font-semibold">
            <dt>Total</dt><dd><Credits n={estimateCredits!} /></dd>
          </div>
          {balance !== null && (
            <div className="flex justify-between gap-4 text-[13px] text-muted">
              <dt>Balance after hold</dt><dd className={`tabular-nums ${short ? "text-danger" : ""}`}>{(balance - estimateCredits!).toLocaleString()}</dd>
            </div>
          )}
        </dl>
      )}
      <p className="flex gap-1.5 text-[13px] text-muted"><Info size={15} className="mt-px shrink-0" aria-hidden /> Credits are held now and charged per finished step. Anything unused comes back.</p>
      {short && (
        <p role="alert" className="text-[13px] text-danger">
          You need {shortBy} more credits. Turn off motion on some scenes, switch to Budget, or <Link href="/credits" className="underline">add credits</Link>.
        </p>
      )}
      {err && <p role="alert" className="text-[13px] text-danger">{err}</p>}
    </div>
  );

  return (
    <section className="enter mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0">
        <h2 className="title">Review the storyboard</h2>
        <p className="mt-1 text-sm text-muted">Choose which scenes move. Motion costs more, stills get a gentle camera move.</p>

        {characters.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {characters.map((c) => (
              <li key={c.id} className="flex max-w-full items-start gap-2 rounded-[var(--radius-control)] bg-surface-2 px-3 py-2 text-[13px]" title={c.description}>
                <UserCircle size={18} className="mt-px shrink-0 text-accent" aria-hidden />
                <span className="min-w-0"><span className="font-medium">{c.name}</span> <span className="line-clamp-1 text-muted">{c.description}</span></span>
              </li>
            ))}
          </ul>
        )}

        <ol className="mt-5 space-y-2.5">
          {scenes.map((s) => {
            const words = s.word_end - s.word_start + 1;
            const delta = estimateScene({ words, animate: true }, "motion", MOTION_RES).credits;
            return (
              <li key={s.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-muted tabular-nums">Scene {s.idx + 1}, {s.shot_type.replace("_", " ")}, about {Math.round(words / 2.5)} sec</p>
                    <p className="mt-1.5 text-[15px] leading-snug">{s.narration}</p>
                    <p className="mt-2 text-[13px] leading-snug text-muted">{s.visual_prompt}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Switch checked={s.animate} disabled={busy !== null} label={`Motion for scene ${s.idx + 1}`}
                      onChange={(v) => call(`s${s.id}`, "rpc_set_scene_animate", { p_scene: s.id, p_animate: v })} />
                    <span className={`text-[12px] tabular-nums ${s.animate ? "text-fg" : "text-muted"}`}>Motion +{delta}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* desktop: sticky cost panel */}
      <aside className="hidden lg:block">
        <div className="sticky top-20 rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-float">
          <h3 className="mb-4 text-sm font-semibold">Price</h3>
          {costPanel}
          <div className="mt-5">{approve}</div>
        </div>
      </aside>

      {/* phones and tablets: bottom bar that expands */}
      <div className="material-bar fixed inset-x-0 bottom-0 z-20 border-t border-line lg:hidden">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          {costOpen && <div className="enter mb-4 max-h-[50dvh] overflow-y-auto">{costPanel}</div>}
          <div className="flex items-center gap-3">
            <button onClick={() => setCostOpen((o) => !o)} aria-expanded={costOpen} className="press flex min-w-0 items-center gap-1.5 text-left text-[13px]">
              <CaretUp size={14} className={`shrink-0 transition-transform duration-300 ${costOpen ? "rotate-180" : ""}`} aria-hidden />
              <span className="truncate">{recalculating ? "Updating price" : <>Total <Credits n={estimateCredits!} className="font-semibold" /></>}</span>
            </button>
            <div className="ml-auto">
              <Button onClick={() => call("approve", "rpc_approve_plan", { p_project: projectId })} disabled={busy !== null || recalculating || short} busy={busy === "approve"}>
                Generate video
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="h-16 lg:hidden" aria-hidden />
    </section>
  );
}
