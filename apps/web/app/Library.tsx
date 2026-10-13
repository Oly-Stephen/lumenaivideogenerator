"use client";

import { FilmSlate, Plus, Sparkle, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { btn, EmptyState } from "@/components/ui";
import { useSignedUrls } from "@/lib/media";
import { formatLabel, relativeTime, statusLabel, TERMINAL, WAITING } from "@/lib/stages";
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
  thumb: string | null;
}

const STARTERS = ["Why do cats purr?", "How do noise-cancelling headphones work?", "What would happen if the Moon disappeared?"];

export function Library({ initial }: { initial: LibraryItem[] }) {
  const supabase = useMemo(() => browserClient(), []);
  const router = useRouter();
  const urls = useSignedUrls(supabase, initial.map((p) => p.thumb));
  const working = initial.some((p) => !TERMINAL.has(p.status) && !WAITING.has(p.status));

  // In-progress cards stay current without a realtime channel per project.
  useEffect(() => {
    if (!working) return;
    const t = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(t);
  }, [working, router]);

  return (
    <main className="mx-auto max-w-6xl px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="display">Library</h1>
          {initial.length > 0 && <p className="mt-1 text-muted">{initial.length} {initial.length === 1 ? "video" : "videos"}</p>}
        </div>
        {initial.length > 0 && (
          <Link href="/new" className={btn("primary", "md", "sm:hidden")}><Plus size={16} weight="bold" aria-hidden /> New video</Link>
        )}
      </div>

      {initial.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={<FilmSlate size={24} />}
            title="Make your first video"
            body="Give Lumen a topic or paste a script. You review the script and storyboard, with the price shown, before anything is generated."
            action={
              <div className="flex flex-col items-center gap-4">
                <Link href="/new" className={btn("primary", "lg")}><Plus size={17} weight="bold" aria-hidden /> New video</Link>
                <div className="flex flex-wrap justify-center gap-2">
                  {STARTERS.map((s) => (
                    <Link key={s} href={`/new?topic=${encodeURIComponent(s)}`}
                      className="press inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-[13px] text-muted hover:text-fg">
                      <Sparkle size={13} aria-hidden /> {s}
                    </Link>
                  ))}
                </div>
              </div>
            }
          />
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {initial.map((p, i) => (
            <li key={p.id} className="enter" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
              <Card item={p} url={p.thumb ? urls[p.thumb] : undefined} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Card({ item: p, url }: { item: LibraryItem; url?: string }) {
  const active = !TERMINAL.has(p.status) && !WAITING.has(p.status);
  const needsYou = WAITING.has(p.status);
  const problem = p.status === "failed" || p.status === "paused_insufficient_credits";
  return (
    <Link href={`/projects/${p.id}`} className="group block focus-visible:outline-none">
      <div className={`relative overflow-hidden rounded-[var(--radius-card)] bg-surface-2 ring-1 ring-line transition-shadow group-hover:shadow-float group-focus-visible:ring-2 group-focus-visible:ring-accent ${p.format === "short_9x16" ? "aspect-[9/16]" : "aspect-video"}`}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="fade h-full w-full object-cover transition-transform duration-500 ease-[var(--ease)] group-hover:scale-[1.03]" />
        ) : p.thumb ? (
          <div className="skeleton h-full w-full rounded-none" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted"><FilmSlate size={28} aria-hidden /></div>
        )}
        {active && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
            <div className="h-full bg-accent transition-[width] duration-700 ease-[var(--ease)]" style={{ width: `${Math.max(4, Number(p.progress))}%` }} />
          </div>
        )}
      </div>
      <div className="mt-2.5 px-0.5">
        <p className="line-clamp-2 text-[14px] leading-snug font-medium">{p.title ?? p.input_text}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
          {problem && <WarningCircle size={14} weight="fill" className="text-danger" aria-hidden />}
          <span className={needsYou ? "font-medium text-accent" : problem ? "text-danger" : ""}>
            {p.status === "completed" ? formatLabel(p.format) : statusLabel(p.status)}
          </span>
          <span aria-hidden>·</span>
          <span>{relativeTime(p.created_at)}</span>
        </p>
      </div>
    </Link>
  );
}
