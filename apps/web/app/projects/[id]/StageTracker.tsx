"use client";

import { Check } from "@phosphor-icons/react";
import { STAGES, stageIndex } from "@/lib/stages";

/** Six named pipeline stages: done, current (with live detail), upcoming. Honest status, not a spinner. */
export function StageTracker({ status, detail, progress, paused }: { status: string; detail: string | null; progress: number; paused?: boolean }) {
  const current = stageIndex(status);
  const done = status === "completed";
  return (
    <div>
      <ol className="grid grid-cols-6 gap-1.5" aria-label="Progress">
        {STAGES.map((s, i) => {
          const state = done || i < current ? "done" : i === current ? "current" : "todo";
          return (
            <li key={s.key} aria-current={state === "current" ? "step" : undefined} className="min-w-0">
              <div className="relative h-1 overflow-hidden rounded-full bg-line-strong/60">
                {state === "done" && <div className="absolute inset-0 bg-accent" />}
                {state === "current" && !paused && (
                  <div className="absolute inset-y-0 w-2/5 rounded-full bg-accent motion-safe:animate-[indeterminate_1.6s_var(--ease)_infinite]" />
                )}
                {state === "current" && paused && <div className="absolute inset-0 bg-warning/60" />}
              </div>
              <p className={`mt-2 hidden items-center gap-1 truncate text-[12px] sm:flex ${state === "todo" ? "text-muted/70" : state === "current" ? "font-medium text-fg" : "text-muted"}`}>
                {state === "done" && <Check size={12} weight="bold" className="shrink-0 text-accent" aria-hidden />}
                {s.label}
              </p>
            </li>
          );
        })}
      </ol>
      {!done && (
        <p className="mt-3 text-sm" aria-live="polite">
          <span className="font-medium sm:hidden">{STAGES[current]?.label}: </span>
          <span className="text-muted">{detail ?? "Working"}</span>
          {status === "generating_scenes" && progress > 0 && <span className="text-muted tabular-nums"> ({Math.round(progress)}%)</span>}
        </p>
      )}
    </div>
  );
}
