"use client";

import { ArrowSquareOut, CaretDown, Info } from "@phosphor-icons/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Button } from "@/components/ui";

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

const host = (u: string) => {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
};

export function ScriptReview({ supabase, projectId, script, targetS, onChanged }: {
  supabase: SupabaseClient; projectId: string; script: ScriptView; targetS: number; onChanged: () => void;
}) {
  const [text, setText] = useState(script.full_text);
  const [busy, setBusy] = useState<"save" | "approve" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showClaims, setShowClaims] = useState(false);
  const dirty = text.trim() !== script.full_text.trim();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const secs = Math.round(words / 2.5);
  const over = secs > targetS * 1.15;

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
    <section className="enter mx-auto mt-8 max-w-[68ch]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="title">Review the script</h2>
        <span className="text-[13px] text-muted">Version {script.version}, {script.source === "user_edit" ? "your edit" : "AI draft"}</span>
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><Info size={15} aria-hidden /> Editing is free. The storyboard is built from the version you approve.</p>

      <label htmlFor="script" className="sr-only">Narration</label>
      <textarea id="script" value={text} onChange={(e) => setText(e.target.value)} rows={Math.min(16, Math.max(7, Math.ceil(words / 11)))}
        className="mt-4 w-full rounded-[var(--radius-card)] border border-line bg-surface p-4 text-[17px] leading-[1.65] shadow-[inset_0_1px_2px_rgb(0_0_0/0.03)] focus:border-accent focus:ring-3 focus:ring-accent-soft focus:outline-none focus-visible:outline-none" />
      <p className={`mt-2 text-[13px] tabular-nums ${over ? "text-warning" : "text-muted"}`}>
        {words} words, about {secs} sec narrated (target {targetS} sec){over ? ". Longer than the target, consider trimming." : ""}
      </p>

      {claims.length > 0 && (
        <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface">
          <button onClick={() => setShowClaims((s) => !s)} aria-expanded={showClaims}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium">
            Facts used, with sources ({claims.length})
            <CaretDown size={15} className={`text-muted transition-transform duration-300 ${showClaims ? "rotate-180" : ""}`} aria-hidden />
          </button>
          {showClaims && (
            <ul className="enter divide-y divide-line border-t border-line">
              {claims.map((c, i) => (
                <li key={i} className="px-4 py-3 text-sm">
                  <p>{c.text}</p>
                  <a href={c.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[13px] text-accent hover:underline">
                    {host(c.source_url)} <ArrowSquareOut size={12} aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {err && <p role="alert" className="mt-4 text-sm text-danger">{err}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={save} disabled={!dirty || busy !== null} busy={busy === "save"}>Save changes</Button>
        <Button onClick={approve} disabled={busy !== null || words < 3} busy={busy === "approve"}>
          {dirty ? "Save and approve" : "Approve script"}
        </Button>
      </div>
    </section>
  );
}
