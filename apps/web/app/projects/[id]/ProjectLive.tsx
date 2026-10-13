"use client";

import { ArrowCounterClockwise, ArrowLeft, CaretDown, DownloadSimple, FilmSlate, Play, Prohibit } from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { btn, Button, Notice, Sheet, Skeleton, useToast } from "@/components/ui";
import { useSignedUrls } from "@/lib/media";
import { formatLabel, TERMINAL, WAITING } from "@/lib/stages";
import { browserClient } from "@/lib/supabase";
import { PlanReview } from "./PlanReview";
import { RedoSheet } from "./RedoScene";
import { ScriptReview, type ScriptView } from "./ScriptReview";
import { StageTracker } from "./StageTracker";
import { PROJECT_COLUMNS, SCENE_COLUMNS, type Project, type Scene } from "./types";

interface Ledger { reason: string; delta: number }

/** Turns raw pipeline errors into a sentence a person can act on; the raw text stays under "Details". */
function explainFailure(detail: string | null, paused: boolean): string {
  const d = (detail ?? "").toLowerCase();
  if (paused || d.includes("cap") || d.includes("insufficient")) return "Generation is paused because a spending limit was reached. Nothing more will be charged until you continue.";
  if (d.includes("fetch failed") || d.includes("enotfound") || d.includes("econnreset") || d.includes("timeout")) return "A service didn't respond in time. Finished steps are kept, so Retry picks up where it stopped.";
  if (d.includes("refus")) return "The writing model declined this topic. Try rephrasing it.";
  return "Something went wrong in one step. Finished steps are kept, so Retry picks up where it stopped.";
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
  const working = !TERMINAL.has(status) && !WAITING.has(status);
  const canCancel = !TERMINAL.has(status) || paused;
  const held = -ledger.filter((r) => r.reason === "reservation").reduce((a, r) => a + r.delta, 0);
  const charged = -ledger.filter((r) => r.reason === "charge").reduce((a, r) => a + r.delta, 0);

  function seek(s: Scene) {
    if (!player.current || s.start_ms === null) return;
    player.current.currentTime = s.start_ms / 1000;
    void player.current.play();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pt-6 pb-24 sm:px-6">
      <Link href="/" className="press inline-flex items-center gap-1 rounded-full py-1 pr-2 text-[13px] text-muted hover:text-fg">
        <ArrowLeft size={14} aria-hidden /> Library
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <h1 className="display">{project.title ?? project.input_text}</h1>
          <p className="mt-1.5 text-sm text-muted">
            {formatLabel(project.format)} {vertical ? "9:16" : "16:9"}, {project.quality === "budget" ? "Budget" : project.quality === "standard" ? "Standard" : "Premium"}
            {project.target_duration_s ? `, ${project.target_duration_s} sec` : ""}
          </p>
        </div>
        {canCancel && (
          <Button variant="secondary" size="sm" onClick={() => setConfirmCancel(true)} disabled={busy !== null}>
            <Prohibit size={15} aria-hidden /> Cancel
          </Button>
        )}
      </header>

      {!done && status !== "canceled" && (
        <div className="mt-8">
          <StageTracker status={failed || paused ? stageFromDetail(project) : status} detail={working ? project.status_detail : null}
            progress={Number(project.progress)} paused={failed || paused} />
        </div>
      )}

      {(failed || paused) && (
        <div className="mt-6">
          <Notice tone={failed ? "danger" : "warning"} title={failed ? "This video stopped" : "Paused"}
            action={
              <Button onClick={() => rpc("retry", "rpc_retry_project", { p_project_id: project.id }, "Picking up where it stopped.")} busy={busy === "retry"}>
                <ArrowCounterClockwise size={16} aria-hidden /> {paused ? "Continue" : "Retry"}
              </Button>
            }>
            <p>{explainFailure(project.status_detail, paused)}</p>
            {project.status_detail && (
              <div className="mt-2">
                <button onClick={() => setShowDetails((d) => !d)} aria-expanded={showDetails} className="inline-flex items-center gap-1 text-[12px] underline-offset-2 hover:underline">
                  Details <CaretDown size={11} className={showDetails ? "rotate-180" : ""} aria-hidden />
                </button>
                {showDetails && <p className="mt-1 font-mono text-[12px] break-words">{project.status_detail}</p>}
              </div>
            )}
          </Notice>
        </div>
      )}

      {status === "canceled" && (
        <div className="mt-6"><Notice tone="neutral" title="Canceled">Unused held credits were returned to your balance.</Notice></div>
      )}

      {status === "awaiting_script_approval" && script && (
        <ScriptReview key={script.id} supabase={supabase} projectId={project.id} script={script} targetS={project.target_duration_s} onChanged={refresh} />
      )}
      {status === "awaiting_plan_approval" && scenes && (
        <PlanReview supabase={supabase} projectId={project.id} quality={project.quality} estimate={project.estimate}
          estimateCredits={project.estimate_credits} balance={balance} scenes={scenes} characters={characters} onChanged={refresh} />
      )}

      {done && (
        <section className={`enter mt-8 grid gap-8 ${vertical ? "md:grid-cols-[minmax(0,380px)_1fr]" : ""}`}>
          <div className={vertical ? "mx-auto w-full max-w-[380px]" : ""}>
            <div className={`overflow-hidden rounded-[var(--radius-card)] bg-black shadow-float ${vertical ? "aspect-[9/16] max-h-[72dvh]" : "aspect-video"}`}>
              {videoUrl
                ? <video ref={player} key={videoUrl} src={videoUrl} controls playsInline preload="metadata"
                    poster={scenes?.[0]?.keyframe_asset_id ? urls[scenes[0].keyframe_asset_id] : undefined} className="fade h-full w-full" />
                : <Skeleton className="h-full w-full rounded-none" />}
            </div>
          </div>
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              {videoUrl
                ? <a href={videoUrl} download={`${(project.title ?? "lumen-video").replace(/[^\w\- ]+/g, "").trim() || "lumen-video"}.mp4`} className={btn("primary", "lg")}>
                    <DownloadSimple size={18} weight="bold" aria-hidden /> Download MP4
                  </a>
                : <Button size="lg" disabled>Preparing download</Button>}
            </div>
            {held > 0 && (
              <p className="text-sm text-muted">
                Used <span className="font-medium text-fg tabular-nums">{charged}</span> credits.
                {held - charged > 0 && <> <span className="tabular-nums">{held - charged}</span> held credits were returned.</>}
              </p>
            )}
            <p className="text-sm text-muted">Something off in one scene? Choose Redo on it below. Only that scene is regenerated.</p>
          </div>
        </section>
      )}

      {scenes && scenes.length > 0 && status !== "awaiting_plan_approval" && (
        <section className="mt-12">
          <h2 className="title">Scenes</h2>
          <ol className={`mt-4 grid gap-x-3 gap-y-5 ${vertical ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
            {scenes.map((s) => {
              const url = s.keyframe_asset_id ? urls[s.keyframe_asset_id] : undefined;
              const redoing = !done && s.status !== "ready" && s.revision > 1;
              return (
                <li key={s.id} className="group min-w-0">
                  <button onClick={() => seek(s)} disabled={!done || !videoUrl} aria-label={`Play from scene ${s.idx + 1}`}
                    className={`relative block w-full overflow-hidden rounded-[var(--radius-control)] bg-surface-2 ring-1 ring-line disabled:cursor-default ${vertical ? "aspect-[9/16]" : "aspect-video"}`}>
                    {url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={url} alt="" className="fade h-full w-full object-cover" />
                      : s.keyframe_asset_id || working
                        ? <Skeleton className="h-full w-full rounded-none" />
                        : <span className="flex h-full items-center justify-center text-muted"><FilmSlate size={22} aria-hidden /></span>}
                    {s.clip_asset_id && s.animate && (
                      <span className="absolute top-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm" title="Animated">
                        <Play size={10} weight="fill" aria-hidden />
                      </span>
                    )}
                    {redoing && <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-center text-[11px] text-white backdrop-blur-sm">Redoing</span>}
                  </button>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[12px] text-muted tabular-nums">
                      {s.idx + 1}{s.start_ms !== null && s.end_ms !== null ? `, ${((s.end_ms - s.start_ms) / 1000).toFixed(1)}s` : ""}
                      {s.revision > 1 ? `, v${s.revision}` : ""}
                      {s.error?.degraded ? ", still" : ""}
                    </span>
                    {done && (
                      <button onClick={() => setRedo(s)} className="press rounded-full px-2 py-0.5 text-[12px] font-medium text-accent hover:bg-accent-soft">Redo</button>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug">{s.narration}</p>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {working && (
        <p className="mt-10 text-center text-[13px] text-muted">You can leave this page. Progress continues and shows in your Library.</p>
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
          Work in progress stops now. Credits already used for finished steps stay charged, and every unused held credit is returned. This can't be undone.
        </p>
      </Sheet>
    </main>
  );
}

/** For failed/paused projects, show the tracker at the stage that stopped (from the last detail line). */
function stageFromDetail(p: Project): string {
  const d = (p.status_detail ?? "").toLowerCase();
  if (d.includes("script") || d.includes("research")) return "scripting";
  if (d.includes("plan")) return "planning";
  if (d.includes("style")) return "locking_style";
  if (d.includes("narrat") || d.includes("voice")) return "narrating";
  if (d.includes("render") || d.includes("assembl") || d.includes("music")) return "rendering";
  return "generating_scenes";
}
