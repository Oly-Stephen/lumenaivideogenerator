"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ScriptView {
  id: string;
  version: number;
  source: string;
  full_text: string;
  word_count: number;
  est_duration_s: number;
  body: { title?: string; claims?: { text: string; source_url: string }[] } | null;
  research: { sources?: string[]; notes?: string } | null;
}

export function ScriptReview({ supabase, projectId, script, onChanged }: {
  supabase: SupabaseClient; projectId: string; script: ScriptView; onChanged: () => void;
}) {
  const [text, setText] = useState(script.full_text);
  const [busy, setBusy] = useState<"save" | "approve" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const dirty = text.trim() !== script.full_text.trim();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  async function save() {
    setBusy("save"); setErr(null);
    const { error } = await supabase.rpc("rpc_submit_script_edit", { p_project: projectId, p_full_text: text });
    setBusy(null);
    if (error) setErr(error.message); else onChanged();
  }
  async function approve() {
    setBusy("approve"); setErr(null);
    if (dirty) {
      const { error } = await supabase.rpc("rpc_submit_script_edit", { p_project: projectId, p_full_text: text });
      if (error) { setBusy(null); return setErr(error.message); }
    }
    const { error } = await supabase.rpc("rpc_approve_script", { p_project: projectId });
    setBusy(null);
    if (error) setErr(error.message); else onChanged();
  }

  const claims = script.body?.claims ?? [];
  return (
    <section className="mt-6 rounded-lg border border-black/10 p-4 dark:border-white/15">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Review the script</h2>
        <span className="text-xs text-[color:var(--muted)]">v{script.version} · {script.source === "user_edit" ? "your edit" : "AI draft"}</span>
      </div>
      <p className="mt-1 text-sm text-[color:var(--muted)]">Edit freely — the scene plan is rebuilt from whatever you approve.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8}
        className="mt-3 w-full rounded-md border border-black/15 bg-transparent p-3 leading-relaxed dark:border-white/20" />
      <p className="mt-1 text-xs text-[color:var(--muted)]">{words} words · about {Math.round(words / 2.5)} seconds narrated</p>

      {claims.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium">Facts used and their sources ({claims.length})</summary>
          <ul className="mt-2 space-y-1">
            {claims.map((c, i) => (
              <li key={i}>{c.text} — <a className="underline break-all" href={c.source_url} target="_blank" rel="noreferrer">{new URL(c.source_url).hostname}</a></li>
            ))}
          </ul>
        </details>
      )}

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={save} disabled={!dirty || busy !== null} className="rounded-md border border-black/15 px-3 py-2 text-sm disabled:opacity-50 dark:border-white/20">
          {busy === "save" ? "Saving…" : "Save edit"}
        </button>
        <button onClick={approve} disabled={busy !== null || words < 3} className="rounded-md bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {busy === "approve" ? "Approving…" : dirty ? "Save & approve script" : "Approve script"}
        </button>
      </div>
    </section>
  );
}
