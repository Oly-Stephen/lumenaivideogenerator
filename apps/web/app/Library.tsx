"use client";

import { FilmSlate, MagnifyingGlass, Play, Plus, Sparkle, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSignedUrls } from "@/lib/media";
import { relativeTime, statusLabel, TERMINAL, WAITING } from "@/lib/stages";
import { browserClient } from "@/lib/supabase";

export interface LibraryItem {
  id: string;
  title: string | null;
  input_text: string;
  format: string;
  status: string;
  status_detail: string | null;
  progress: number;
  created_at: string;
  target_duration_s: number | null;
  style_preset: string | null;
  quality: string | null;
  thumb: string | null;
  lengthMs: number | null;
  sceneCount: number;
}

type Filter = "all" | "short" | "full" | "active" | "review";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "short", label: "Shorts" },
  { key: "full", label: "Full" },
  { key: "active", label: "In progress" },
  { key: "review", label: "Needs you" },
];

const STARTERS = ["Why do cats purr?", "How do black holes form?", "What would happen if the Moon disappeared?"];
const isActive = (s: string) => !TERMINAL.has(s) && !WAITING.has(s);
const needsYou = (s: string) => WAITING.has(s) || s === "failed" || s === "paused_insufficient_credits";
const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, "0")}`;

export function Library({ initial }: { initial: LibraryItem[] }) {
  const supabase = useMemo(() => browserClient(), []);
  const router = useRouter();
  const urls = useSignedUrls(supabase, initial.map((p) => p.thumb));
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const working = initial.some((p) => isActive(p.status));

  // In-progress cards stay current without a realtime channel per project.
  useEffect(() => {
    if (!working) return;
    const t = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(t);
  }, [working, router]);

  const counts: Record<Filter, number> = {
    all: initial.length,
    short: initial.filter((p) => p.format === "short_9x16").length,
    full: initial.filter((p) => p.format !== "short_9x16").length,
    active: initial.filter((p) => isActive(p.status)).length,
    review: initial.filter((p) => needsYou(p.status)).length,
  };
  const shown = initial.filter((p) => {
    if (filter === "short" && p.format !== "short_9x16") return false;
    if (filter === "full" && p.format === "short_9x16") return false;
    if (filter === "active" && !isActive(p.status)) return false;
    if (filter === "review" && !needsYou(p.status)) return false;
    const hay = `${p.title ?? ""} ${p.input_text}`.toLowerCase();
    return !q.trim() || hay.includes(q.trim().toLowerCase());
  });

  return (
    <main className="dots min-h-dvh">
      <div className="mx-auto max-w-[1400px] px-4 pt-8 pb-20 sm:px-8 lg:pt-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] leading-tight font-semibold tracking-[-0.03em]">Library</h1>
            <p className="mt-1 text-[15px] text-muted">{initial.length} {initial.length === 1 ? "video" : "videos"}{counts.active ? `, ${counts.active} generating` : ""}</p>
          </div>
          {initial.length > 0 && (
            <label className="relative w-full sm:w-72">
              <span className="sr-only">Search videos</span>
              <MagnifyingGlass size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your videos"
                className="h-10 w-full rounded-full border border-line-strong bg-surface pr-4 pl-10 text-[14px] placeholder:text-muted/80 focus:border-accent focus:ring-4 focus:ring-accent-soft focus:outline-none focus-visible:outline-none" />
            </label>
          )}
        </header>

        {initial.length > 0 && (
          <div role="tablist" aria-label="Filter videos" className="mt-6 flex gap-1.5 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button key={f.key} role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)}
                className={`press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium ${filter === f.key ? "bg-fg text-bg" : "bg-surface text-muted ring-1 ring-line hover:text-fg"}`}>
                {f.label}
                <span className={`tabular-nums ${filter === f.key ? "text-bg/70" : "text-muted/70"}`}>{counts[f.key]}</span>
              </button>
            ))}
          </div>
        )}

        {initial.length === 0 ? (
          <div className="enter mx-auto mt-16 max-w-xl rounded-[28px] border border-line bg-surface p-10 text-center shadow-float">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent"><Sparkle size={22} weight="fill" /></span>
            <h2 className="mt-5 text-[22px] font-semibold tracking-[-0.02em]">Make your first video</h2>
            <p className="mx-auto mt-2 max-w-[40ch] text-muted">Give a topic or paste a script. You review the script and storyboard, with the price, before anything is generated.</p>
            <Link href="/new" className="press mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-[15px] font-semibold text-on-accent hover:bg-accent-hover">
              <Plus size={16} weight="bold" aria-hidden /> New video
            </Link>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {STARTERS.map((s) => (
                <Link key={s} href={`/new?topic=${encodeURIComponent(s)}`} className="press rounded-full bg-surface-2 px-3 py-1.5 text-[13px] text-muted hover:text-fg">{s}</Link>
              ))}
            </div>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-4 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
            {filter === "all" && !q && (
              <li className="enter">
                <Link href="/new" className="press group flex aspect-[9/16] flex-col items-center justify-center gap-3 rounded-[18px] border-2 border-dashed border-line-strong bg-surface/60 text-muted transition-colors hover:border-accent/60 hover:text-accent">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-float transition-transform duration-300 group-hover:scale-105"><Plus size={20} weight="bold" /></span>
                  <span className="text-[14px] font-medium">New video</span>
                </Link>
              </li>
            )}
            {shown.map((p, i) => (
              <li key={p.id} className="enter" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                <Card item={p} url={p.thumb ? urls[p.thumb] : undefined} />
              </li>
            ))}
            {shown.length === 0 && <li className="col-span-full py-16 text-center text-muted">No videos match.</li>}
          </ul>
        )}
      </div>
    </main>
  );
}

function Card({ item: p, url }: { item: LibraryItem; url?: string }) {
  const active = isActive(p.status);
  const waiting = WAITING.has(p.status);
  const problem = p.status === "failed" || p.status === "paused_insufficient_credits";
  const done = p.status === "completed";
  const badge = active
    ? { text: statusLabel(p.status), cls: "bg-white/90 text-fg" }
    : waiting ? { text: statusLabel(p.status), cls: "bg-accent text-on-accent" }
    : problem ? { text: statusLabel(p.status), cls: "bg-white/90 text-danger" }
    : p.status === "canceled" ? { text: "Canceled", cls: "bg-white/90 text-muted" } : null;

  return (
    <Link href={`/projects/${p.id}`} className="group block focus-visible:outline-none">
      <div className="relative aspect-[9/16] overflow-hidden rounded-[18px] bg-surface-2 ring-1 ring-line transition-shadow duration-300 group-hover:shadow-float group-focus-visible:ring-2 group-focus-visible:ring-accent">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" loading="lazy" decoding="async"
            className={`fade h-full w-full transition-transform duration-500 ease-[var(--ease)] group-hover:scale-[1.04] ${p.format === "short_9x16" ? "object-cover" : "bg-black object-contain"}`} />
        ) : p.thumb ? (
          <div className="skeleton h-full w-full rounded-none" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted/70"><FilmSlate size={28} aria-hidden /></div>
        )}

        {badge && (
          <span className={`absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur-sm ${badge.cls}`}>
            {problem && <WarningCircle size={12} weight="fill" aria-hidden />}
            {active && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent motion-safe:animate-pulse" />}
            {badge.text}
          </span>
        )}
        <span className="absolute top-2.5 right-2.5 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
          {p.format === "short_9x16" ? "9:16" : "16:9"}
        </span>
        {done && (
          <>
            <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-fg shadow-float backdrop-blur"><Play size={18} weight="fill" /></span>
            </span>
            {p.lengthMs ? <span className="absolute right-2.5 bottom-2.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">{clock(p.lengthMs)}</span> : null}
          </>
        )}
        {active && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
            <div className="h-full bg-accent transition-[width] duration-700 ease-[var(--ease)]" style={{ width: `${Math.max(4, Number(p.progress))}%` }} />
          </div>
        )}
      </div>
      <div className="mt-2.5 px-0.5">
        <p className="line-clamp-2 text-[14px] leading-snug font-medium">{p.title ?? p.input_text}</p>
        <p className="mt-0.5 text-[12px] text-muted">
          {relativeTime(p.created_at)}{p.sceneCount ? `, ${p.sceneCount} scenes` : ""}
        </p>
      </div>
    </Link>
  );
}
