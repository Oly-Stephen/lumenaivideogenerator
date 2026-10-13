"use client";

import { STYLE_PRESETS } from "@lumen/core";
import {
  ArrowCounterClockwise, ArrowLeft, CaretDown, Coins, DownloadSimple, FilmSlate, Info, Lightning, Prohibit, Sparkle, WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Sheet, Skeleton, useToast } from "@/components/ui";
import { BRAND_SLUG } from "@/lib/brand";
import { useSignedUrls } from "@/lib/media";
import { STAGES, stageIndex, statusLabel, TERMINAL, WAITING } from "@/lib/stages";
import { browserClient } from "@/lib/supabase";
import { PlanReview } from "./PlanReview";
import { RedoSheet } from "./RedoScene";
import { ScriptReview, type ScriptView } from "./ScriptReview";
import { StageTracker } from "./StageTracker";
import { PROJECT_COLUMNS, SCENE_COLUMNS, type Project, type Scene } from "./types";

interface Ledger { reason: string; delta: number }

const STYLE_NAMES: Record<string, string> = Object.fromEntries(STYLE_PRESETS.map((p) => [p.key, p.name]));
const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

/** Turns raw pipeline errors into a sentence a person can act on; the raw text stays under "Details". */
function explainFailure(detail: string | null, paused: boolean): string {
  const d = (detail ?? "").toLowerCase();
  if (paused || d.includes("cap") || d.includes("insufficient")) return "Generation is paused because a spending limit was reached. Nothing more will be charged until you continue.";
  if (d.includes("fetch failed") || d.includes("enotfound") || d.includes("econnreset") || d.includes("timeout")) return "A service didn't respond in time. Finished steps are kept, so Retry picks up where it stopped.";
  if (d.includes("refus")) return "The writing model declined this topic. Try rephrasing it.";
  return "Something went wrong in one step. Finished steps are kept, so Retry picks up where it stopped.";
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-4 py-1.5 text-[13px]"><dt className="text-muted">{k}</dt><dd className="text-right font-medium tabular-nums">{v}</dd></div>;
}

export function ProjectLive({ initial }: { initial: Project }) {
  const supabase = useMemo(() => browserClient(), []);
  const toast = useToast();
  const [project, setProject] = useState(initial);
  const [scenes, setScenes] = useState<Scene[] | null>(null);
  const [script, setScript] = useState<ScriptView | null>(null);
  const [characters, setCharacters] = useState<{ id: string; name: string; description: string }[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [ledger, setLedger] = useState<Ledger[]>([]);
  const [videoAsset, setVideoAsset] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [redo, setRedo] = useState<Scene | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const player = useRef<HTMLVideoElement>(null);

  const refresh = useCallback(async () => {
    const [{ data: p }, { data: s }, { data: c }, { data: b }, { data: l }] = await Promise.all([
      supabase.from("projects").select(PROJECT_COLUMNS).eq("id", initial.id).single(),
      supabase.from("scenes").select(SCENE_COLUMNS).eq("project_id", initial.id).order("idx"),
      supabase.from("characters").select("id, name, description").eq("project_id", initial.id),
      supabase.from("credit_balances").select("balance").maybeSingle(),
      supabase.from("credits_ledger").select("reason, delta").eq("project_id", initial.id),
    ]);
    if (p) {
      const proj = p as Project;
      setProject(proj);
      if (proj.current_script_id) {
        const { data: sc } = await supabase.from("scripts")
          .select("id, version, source, full_text, word_count, est_duration_s, body, research").eq("id", proj.current_script_id).single();
        if (sc) setScript(sc as ScriptView);
      }
      if (proj.final_render_id) {
        const { data: r } = await supabase.from("renders").select("asset_id").eq("id", proj.final_render_id).single();
        setVideoAsset(r?.asset_id ?? null);
      }
    }
    setScenes((s ?? []) as Scene[]);
    if (c) setCharacters(c);
    setBalance(b?.balance ?? 0);
    setLedger((l ?? []) as Ledger[]);
  }, [supabase, initial.id]);

  // Live updates on the private topic project:<id> (RLS-checked), with a slow poll as a safety net.
  useEffect(() => {
    void refresh();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      await supabase.realtime.setAuth();
      channel = supabase.channel(`project:${initial.id}`, { config: { private: true } })
        .on("broadcast", { event: "*" }, () => void refresh())
        .subscribe();
    })();
    const poll = setInterval(() => void refresh(), 15000);
    return () => {
      clearInterval(poll);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase, initial.id, refresh]);

  const urls = useSignedUrls(supabase, [...(scenes ?? []).map((s) => s.keyframe_asset_id), project.status === "completed" ? videoAsset : null]);
  const videoUrl = videoAsset && project.status === "completed" ? urls[videoAsset] : undefined;

  const rpc = useCallback(async (name: string, fn: string, args: Record<string, unknown>, ok?: string) => {
    setBusy(name);
    const { error } = await supabase.rpc(fn, args);
    setBusy(null);
    if (error) toast(error.message, "danger");
    else {
      if (ok) toast(ok);
      void refresh();
    }
  }, [supabase, refresh, toast]);

  const vertical = project.format === "short_9x16";
  const status = project.status;
  const done = status === "completed";
  const failed = status === "failed";
  const paused = status === "paused_insufficient_credits";
  const canceled = status === "canceled";
  const working = !TERMINAL.has(status) && !WAITING.has(status);
  const reviewing = WAITING.has(status);
  const canCancel = !TERMINAL.has(status) || paused;
  const held = -ledger.filter((r) => r.reason === "reservation").reduce((a, r) => a + r.delta, 0);
  const charged = -ledger.filter((r) => r.reason === "charge").reduce((a, r) => a + r.delta, 0);
  const list = scenes ?? [];
  const lengthMs = list.reduce((m, s) => Math.max(m, s.end_ms ?? 0), 0);
  const scene = list.find((s) => s.id === selected) ?? null;
  // While generating, show the newest finished keyframe on the stage.
  const latest = [...list].reverse().find((s) => s.keyframe_asset_id && urls[s.keyframe_asset_id]);
  const stageImg = scene?.keyframe_asset_id ? urls[scene.keyframe_asset_id] : latest?.keyframe_asset_id ? urls[latest.keyframe_asset_id] : undefined;
  const fileName = `${(project.title ?? `${BRAND_SLUG}-video`).replace(/[^\w\- ]+/g, "").trim() || `${BRAND_SLUG}-video`}.mp4`;

  function pick(s: Scene) {
    setSelected((cur) => (cur === s.id ? null : s.id));
    if (done && player.current && s.start_ms !== null) {
      player.current.currentTime = s.start_ms / 1000;
      void player.current.play();
    }
  }

  const statusPill = (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${done ? "bg-[rgb(22_163_74/0.1)] text-[#15803d]" : failed ? "bg-danger-soft text-danger" : paused ? "bg-warning-soft text-warning" : canceled ? "bg-surface-2 text-muted" : reviewing ? "bg-accent-soft text-accent" : "bg-surface-2 text-fg"}`}>
      {working && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent motion-safe:animate-pulse" />}
      {done ? "Ready" : statusLabel(status)}
    </span>
  );

  return (
    <main className="min-h-dvh bg-canvas">
      {/* ---------- header ---------- */}
      <header className="material-bar sticky top-0 z-20 border-b border-line max-lg:top-14">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="Back to Library" className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-fg">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[16px] font-semibold tracking-[-0.01em]">{project.title ?? project.input_text}</h1>
            <p className="truncate text-[12px] text-muted">
              {vertical ? "Short 9:16" : "Full 16:9"}, {STYLE_NAMES[project.style_preset ?? ""] ?? "Custom style"}, {project.quality === "standard" ? "Standard" : project.quality === "budget" ? "Budget" : "Premium"}
            </p>
          </div>
          {statusPill}
          {canCancel && (
            <Button variant="secondary" size="sm" onClick={() => setConfirmCancel(true)} disabled={busy !== null} className="max-sm:hidden">
              <Prohibit size={15} aria-hidden /> Cancel
            </Button>
          )}
          {done && videoUrl && (
            <a href={videoUrl} download={fileName} className="press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 text-[13px] font-semibold text-on-accent hover:bg-accent-hover">
              <DownloadSimple size={16} weight="bold" aria-hidden /> <span className="max-sm:hidden">Download</span>
            </a>
          )}
        </div>
      </header>

      {/* ---------- review steps: full width ---------- */}
      {reviewing && (
        <div className="mx-auto max-w-[1240px] px-4 pb-24 sm:px-6">
          <div className="pt-6"><StageTracker status={status} detail={null} progress={Number(project.progress)} /></div>
          {status === "awaiting_script_approval" && script && (
            <ScriptReview key={script.id} supabase={supabase} projectId={project.id} script={script} targetS={project.target_duration_s} onChanged={refresh} />
          )}
          {status === "awaiting_plan_approval" && scenes && (
            <PlanReview supabase={supabase} projectId={project.id} quality={project.quality} estimate={project.estimate}
              estimateCredits={project.estimate_credits} balance={balance} scenes={scenes} characters={characters} onChanged={refresh} />
          )}
        </div>
      )}

      {/* ---------- editor: stage + storyboard + inspector ---------- */}
      {!reviewing && (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            {/* stage */}
            <div className="dots relative flex min-h-[52dvh] items-center justify-center px-4 py-8 sm:px-8 lg:min-h-[calc(100dvh-4rem-188px)]">
              <div className={`relative overflow-hidden rounded-[20px] bg-black shadow-[0_30px_80px_-30px_rgb(24_24_27/0.45)] ${vertical ? "aspect-[9/16] h-[min(62dvh,620px)]" : "aspect-video w-full max-w-[900px]"}`}>
                {done && videoUrl ? (
                  <video ref={player} key={videoUrl} src={videoUrl} controls playsInline preload="metadata"
                    poster={list[0]?.keyframe_asset_id ? urls[list[0].keyframe_asset_id] : undefined} className="fade h-full w-full object-contain" />
                ) : stageImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={stageImg} src={stageImg} alt="" className={`fade h-full w-full object-cover ${working ? "opacity-90" : ""}`} />
                ) : done ? (
                  <Skeleton className="h-full w-full rounded-none" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-surface text-muted">
                    {working ? <Sparkle size={28} weight="fill" className="text-accent motion-safe:animate-pulse" /> : <FilmSlate size={28} />}
                    <p className="max-w-[24ch] text-center text-[13px]">{working ? (project.status_detail ?? "Getting started") : canceled ? "Canceled" : "Nothing to show yet"}</p>
                  </div>
                )}
                {working && stageImg && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 pt-12 text-white">
                    <p className="flex items-center gap-2 text-[13px] font-medium"><Sparkle size={14} weight="fill" className="motion-safe:animate-pulse" /> {project.status_detail ?? "Working"}</p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white transition-[width] duration-700" style={{ width: `${Math.max(4, Number(project.progress))}%` }} /></div>
                  </div>
                )}
                {scene && !done && (
                  <span className="absolute top-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur">Scene {scene.idx + 1}</span>
                )}
              </div>
            </div>

            {/* storyboard strip */}
            <section className="border-t border-line bg-surface px-4 py-4 sm:px-6" aria-label="Storyboard">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-[13px] font-semibold">Storyboard <span className="font-normal text-muted">{list.length ? `${list.length} scenes${lengthMs ? `, ${clock(lengthMs)}` : ""}` : ""}</span></h2>
                {done && <p className="text-[12px] text-muted max-sm:hidden">Select a scene to jump to it or redo it.</p>}
              </div>
              {list.length === 0 ? (
                <div className="flex gap-2.5 overflow-hidden">
                  {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className={`shrink-0 ${vertical ? "h-[112px] w-[63px]" : "h-[63px] w-[112px]"}`} />)}
                </div>
              ) : (
                <ol className="flex gap-2.5 overflow-x-auto pb-1">
                  {list.map((s) => {
                    const url = s.keyframe_asset_id ? urls[s.keyframe_asset_id] : undefined;
                    const on = s.id === selected;
                    const pending = !s.keyframe_asset_id;
                    return (
                      <li key={s.id} className="shrink-0">
                        <button onClick={() => pick(s)} aria-pressed={on} aria-label={`Scene ${s.idx + 1}`}
                          className={`press relative block overflow-hidden rounded-[10px] bg-surface-2 ring-offset-2 ring-offset-surface ${vertical ? "h-[112px] w-[63px]" : "h-[63px] w-[112px]"} ${on ? "ring-2 ring-accent" : "ring-1 ring-line hover:ring-line-strong"}`}>
                          {url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={url} alt="" className="fade h-full w-full object-cover" />
                            : pending && working ? <Skeleton className="h-full w-full rounded-none" /> : <span className="flex h-full items-center justify-center text-muted"><FilmSlate size={16} /></span>}
                          <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1 text-[10px] font-semibold text-white tabular-nums">{s.idx + 1}</span>
                          {s.animate && s.clip_asset_id && <Lightning size={11} weight="fill" className="absolute top-1 right-1 text-white drop-shadow" aria-label="Animated" />}
                        </button>
                        {s.start_ms !== null && s.end_ms !== null && <p className="mt-1 text-center text-[10px] text-muted tabular-nums">{secs(s.end_ms - s.start_ms)}</p>}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>

          {/* inspector */}
          <aside className="border-line bg-surface lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:border-l" aria-label="Inspector">
            {(failed || paused) && (
              <div className={`m-4 rounded-[14px] p-4 ${failed ? "bg-danger-soft" : "bg-warning-soft"}`} role={failed ? "alert" : "status"}>
                <p className={`flex items-center gap-1.5 text-[14px] font-semibold ${failed ? "text-danger" : "text-warning"}`}>
                  <WarningCircle size={17} weight="fill" aria-hidden /> {failed ? "This video stopped" : "Paused"}
                </p>
                <p className="mt-1 text-[13px] text-fg/80">{explainFailure(project.status_detail, paused)}</p>
                <Button className="mt-3 w-full" onClick={() => rpc("retry", "rpc_retry_project", { p_project_id: project.id }, "Picking up where it stopped.")} busy={busy === "retry"}>
                  <ArrowCounterClockwise size={16} aria-hidden /> {paused ? "Continue" : "Retry"}
                </Button>
                {project.status_detail && (
                  <div className="mt-2">
                    <button onClick={() => setShowDetails((d) => !d)} aria-expanded={showDetails} className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-fg">
                      Details <CaretDown size={11} className={showDetails ? "rotate-180" : ""} aria-hidden />
                    </button>
                    {showDetails && <p className="mt-1 font-mono text-[11px] break-words text-muted">{project.status_detail}</p>}
                  </div>
                )}
              </div>
            )}

            {scene ? (
              <div className="enter p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-accent">Scene {scene.idx + 1} of {list.length}</p>
                  <button onClick={() => setSelected(null)} className="text-[12px] text-muted hover:text-fg">Video details</button>
                </div>
                <p className="mt-2 text-[17px] leading-snug font-semibold tracking-[-0.01em]">&ldquo;{scene.narration}&rdquo;</p>
                <dl className="mt-4 divide-y divide-line border-y border-line">
                  {scene.start_ms !== null && scene.end_ms !== null && <Row k="Time" v={`${clock(scene.start_ms)} to ${clock(scene.end_ms)}`} />}
                  <Row k="Shot" v={scene.shot_type.replace("_", " ")} />
                  <Row k="Motion" v={scene.animate ? (scene.error?.degraded ? "Still (motion failed)" : "Animated") : "Camera move"} />
                  {scene.revision > 1 && <Row k="Version" v={`v${scene.revision}`} />}
                </dl>
                <p className="mt-4 text-[12px] font-semibold text-muted">Image</p>
                <p className="mt-1 text-[13px] leading-relaxed">{scene.visual_prompt}</p>
                {scene.motion_prompt && (<><p className="mt-3 text-[12px] font-semibold text-muted">Camera</p><p className="mt-1 text-[13px]">{scene.motion_prompt}</p></>)}
                {done && (
                  <Button className="mt-5 w-full" onClick={() => setRedo(scene)}>
                    <ArrowCounterClockwise size={16} aria-hidden /> Redo this scene
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-5">
                {working && (
                  <div className="mb-5">
                    <p className="text-[12px] font-semibold text-muted">Progress</p>
                    <ol className="mt-2 space-y-1.5">
                      {STAGES.map((st, i) => {
                        const cur = stageIndex(status);
                        const state = i < cur ? "done" : i === cur ? "now" : "todo";
                        return (
                          <li key={st.key} className={`flex items-center gap-2.5 text-[13px] ${state === "todo" ? "text-muted/70" : ""}`}>
                            <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${state === "done" ? "bg-[#16a34a]" : state === "now" ? "bg-accent motion-safe:animate-pulse" : "bg-line-strong"}`} />
                            <span className={state === "now" ? "font-semibold" : ""}>{st.label}</span>
                            {state === "now" && <span className="ml-auto truncate text-[12px] text-muted">{Math.round(Number(project.progress))}%</span>}
                          </li>
                        );
                      })}
                    </ol>
                    <p className="mt-3 flex gap-1.5 text-[12px] text-muted"><Info size={14} className="mt-px shrink-0" aria-hidden /> You can leave this page; progress continues and shows in your Library.</p>
                  </div>
                )}

                <p className="text-[12px] font-semibold text-muted">Video</p>
                <dl className="mt-1 divide-y divide-line">
                  <Row k="Format" v={vertical ? "Short 9:16" : "Full 16:9"} />
                  <Row k="Length" v={lengthMs ? clock(lengthMs) : `${project.target_duration_s} sec target`} />
                  <Row k="Scenes" v={list.length || "..."} />
                  <Row k="Style" v={STYLE_NAMES[project.style_preset ?? ""] ?? "Custom"} />
                  <Row k="Quality" v={project.quality === "standard" ? "Standard" : project.quality === "budget" ? "Budget" : "Premium"} />
                  {characters.length > 0 && <Row k="Characters" v={characters.map((c) => c.name).join(", ")} />}
                </dl>

                <p className="mt-6 flex items-center gap-1.5 text-[12px] font-semibold text-muted"><Coins size={14} aria-hidden /> Credits</p>
                <dl className="mt-1 divide-y divide-line">
                  {project.estimate_credits !== null && <Row k="Estimate" v={project.estimate_credits} />}
                  <Row k="Used" v={charged} />
                  {held > charged && (done || canceled || failed) && <Row k="Returned" v={held - charged} />}
                  {balance !== null && <Row k="Your balance" v={balance.toLocaleString()} />}
                </dl>

                {done && <p className="mt-6 rounded-[12px] bg-surface-2 p-3 text-[12px] text-muted">Something off in one scene? Select it in the storyboard and choose Redo. Only that scene is regenerated.</p>}
                {canCancel && (
                  <Button variant="danger" size="sm" className="mt-6 w-full sm:hidden" onClick={() => setConfirmCancel(true)}>
                    <Prohibit size={15} aria-hidden /> Cancel video
                  </Button>
                )}
              </div>
            )}
          </aside>
        </div>
      )}

      {redo && (
        <RedoSheet supabase={supabase} scene={redo} balance={balance} thumb={redo.keyframe_asset_id ? urls[redo.keyframe_asset_id] : undefined}
          onClose={() => setRedo(null)} onDone={refresh} />
      )}

      <Sheet open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel this video?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmCancel(false)}>Keep going</Button>
            <Button variant="danger" busy={busy === "cancel"} onClick={async () => {
              await rpc("cancel", "rpc_cancel_project", { p_project: project.id }, "Canceled. Unused credits were returned.");
              setConfirmCancel(false);
            }}>Cancel video</Button>
          </div>
        }>
        <p className="text-sm text-muted">
          Work in progress stops now. Credits already used for finished steps stay charged, and every unused held credit is returned. This can&rsquo;t be undone.
        </p>
      </Sheet>
    </main>
  );
}
