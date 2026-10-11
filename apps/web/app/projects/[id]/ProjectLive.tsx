"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase";

interface Project {
  id: string;
  title: string | null;
  input_text: string;
  format: string;
  quality: string;
  status: string;
  status_detail: string | null;
  progress: number;
  final_render_id: string | null;
  error: unknown;
}
interface Scene {
  id: string;
  idx: number;
  narration: string;
  status: string;
  animate: boolean;
  keyframe_asset_id: string | null;
  clip_asset_id: string | null;
  start_ms: number | null;
  end_ms: number | null;
  error: { degraded?: boolean } | null;
}

const TERMINAL = new Set(["completed", "failed", "canceled", "paused_insufficient_credits"]);

export function ProjectLive({ initial }: { initial: Project }) {
  const supabase = useMemo(() => browserClient(), []);
  const [project, setProject] = useState(initial);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const requested = useRef(new Set<string>());

  const sign = useCallback(async (assetId: string) => {
    if (requested.current.has(assetId)) return;
    requested.current.add(assetId);
    const { data } = await supabase.functions.invoke<{ url: string }>("sign-url", { body: { asset_id: assetId } });
    if (data?.url) setUrls((u) => ({ ...u, [assetId]: data.url }));
  }, [supabase]);

  const refresh = useCallback(async () => {
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("projects").select("id, title, input_text, format, quality, status, status_detail, progress, final_render_id, error").eq("id", initial.id).single(),
      supabase.from("scenes").select("id, idx, narration, status, animate, keyframe_asset_id, clip_asset_id, start_ms, end_ms, error").eq("project_id", initial.id).order("idx"),
    ]);
    if (p) setProject(p as Project);
    if (s) setScenes(s as Scene[]);
  }, [supabase, initial.id]);

  // live updates: private broadcast topic project:<id> (RLS-checked), with a slow poll as a safety net
  useEffect(() => {
    void refresh();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      await supabase.realtime.setAuth();
      channel = supabase
        .channel(`project:${initial.id}`, { config: { private: true } })
        .on("broadcast", { event: "*" }, () => void refresh())
        .subscribe();
    })();
    const poll = setInterval(() => void refresh(), 15000);
    return () => {
      clearInterval(poll);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase, initial.id, refresh]);

  useEffect(() => {
    scenes.forEach((s) => s.keyframe_asset_id && void sign(s.keyframe_asset_id));
  }, [scenes, sign]);

  useEffect(() => {
    if (!project.final_render_id) return;
    (async () => {
      const { data: r } = await supabase.from("renders").select("asset_id").eq("id", project.final_render_id!).single();
      if (r?.asset_id) {
        const { data } = await supabase.functions.invoke<{ url: string }>("sign-url", { body: { asset_id: r.asset_id } });
        if (data?.url) setVideoUrl(data.url);
      }
    })();
  }, [supabase, project.final_render_id]);

  const [retrying, setRetrying] = useState(false);
  const retry = useCallback(async () => {
    setRetrying(true);
    const { error } = await supabase.rpc("rpc_retry_project", { p_project_id: initial.id });
    setRetrying(false);
    if (error) alert(error.message);
    else void refresh();
  }, [supabase, initial.id, refresh]);

  const vertical = project.format === "short_9x16";
  const done = project.status === "completed";

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/" className="text-sm text-[color:var(--muted)]">← All videos</Link>
      <h1 className="mt-2 text-2xl font-semibold">{project.title ?? project.input_text}</h1>
      <p className="text-sm text-[color:var(--muted)]">{vertical ? "Short · 9:16" : "Full · 16:9"} · {project.quality}</p>

      {!TERMINAL.has(project.status) && (
        <div className="mt-6">
          <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div className="h-full bg-[color:var(--accent)] transition-all" style={{ width: `${Math.max(3, Number(project.progress))}%` }} />
          </div>
          <p className="mt-2 text-sm">{project.status_detail ?? project.status}</p>
        </div>
      )}
      {(project.status === "failed" || project.status === "paused_insufficient_credits") && (
        <div className={`mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md p-3 text-sm ${project.status === "failed" ? "bg-red-600/10 text-red-700 dark:text-red-300" : "bg-amber-500/10"}`}>
          <span className="min-w-0 break-words">{project.status === "failed" ? "Failed" : "Paused"}: {project.status_detail}</span>
          <button onClick={retry} disabled={retrying} className="shrink-0 rounded-md bg-[color:var(--accent)] px-3 py-1.5 font-medium text-white disabled:opacity-60">
            {retrying ? "Retrying…" : "Retry"}
          </button>
        </div>
      )}

      {done && videoUrl && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <video src={videoUrl} controls playsInline className={`rounded-lg bg-black ${vertical ? "max-h-[70vh] aspect-[9/16]" : "w-full aspect-video"}`} />
          <a href={videoUrl} download className="text-sm underline">Download MP4</a>
        </div>
      )}

      {scenes.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium">Scenes</h2>
          <ol className={`grid gap-3 ${vertical ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-5" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"}`}>
            {scenes.map((s) => (
              <li key={s.id} className="overflow-hidden rounded-md border border-black/10 dark:border-white/10">
                <div className={`${vertical ? "aspect-[9/16]" : "aspect-video"} bg-black/5 dark:bg-white/5`}>
                  {s.keyframe_asset_id && urls[s.keyframe_asset_id]
                    ? <img src={urls[s.keyframe_asset_id]} alt={`Scene ${s.idx + 1}`} className="h-full w-full object-cover" />
                    : <div className="flex h-full items-center justify-center text-xs text-[color:var(--muted)]">{s.status.replace("_", " ")}</div>}
                </div>
                <div className="p-2 text-xs">
                  <span className="font-medium">#{s.idx + 1}</span>{" "}
                  {s.start_ms !== null && s.end_ms !== null && <span className="text-[color:var(--muted)]">{((s.end_ms - s.start_ms) / 1000).toFixed(1)}s · </span>}
                  <span className="text-[color:var(--muted)]">{s.animate ? "animated" : s.error?.degraded ? "still (motion failed)" : "still"}</span>
                  <p className="mt-1 line-clamp-3">{s.narration}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
