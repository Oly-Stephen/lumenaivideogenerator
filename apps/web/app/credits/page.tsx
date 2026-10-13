import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server";
import { CreditHistory, type LedgerRow } from "./CreditHistory";

export const dynamic = "force-dynamic";
export const metadata = { title: "Credits" };

export default async function CreditsPage() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const { data: rows } = await supabase
    .from("credits_ledger")
    .select("id, created_at, reason, delta, note, project_id, projects(title, input_text)")
    .order("id", { ascending: true })
    .limit(1000);

  const ledger: LedgerRow[] = (rows ?? []).map((r) => {
    // to-one embed; typed as an array by the untyped client
    const rel = r.projects as unknown as { title: string | null; input_text: string } | { title: string | null; input_text: string }[] | null;
    const proj = Array.isArray(rel) ? rel[0] : rel;
    return { id: r.id, created_at: r.created_at, reason: r.reason, delta: r.delta, note: r.note, project_id: r.project_id, title: proj?.title ?? proj?.input_text ?? null };
  });
  const balance = ledger.reduce((a, r) => a + r.delta, 0);

  return (
    <main className="mx-auto max-w-3xl px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
      <h1 className="display">Credits</h1>
      <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-6">
        <p className="text-[13px] font-medium text-muted">Balance</p>
        <p className="mt-1 text-[44px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{balance.toLocaleString()}</p>
        <p className="mt-4 max-w-[60ch] text-sm text-muted">
          One credit is one cent of generation cost. Credits are held when you approve a storyboard, charged as each step finishes,
          and anything unused is returned when the video is done or canceled.
        </p>
      </div>
      <CreditHistory rows={ledger} />
    </main>
  );
}
