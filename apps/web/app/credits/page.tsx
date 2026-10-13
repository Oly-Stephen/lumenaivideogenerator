import { ArrowCounterClockwise, Coins, Lock, Receipt } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server";
import { CreditHistory, type LedgerRow } from "./CreditHistory";

export const dynamic = "force-dynamic";
export const metadata = { title: "Credits" };

export default async function CreditsPage() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login?next=/credits");
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
  const added = ledger.filter((r) => ["grant", "purchase", "refund", "adjustment"].includes(r.reason) && r.delta > 0).reduce((a, r) => a + r.delta, 0);
  const used = -ledger.filter((r) => r.reason === "charge").reduce((a, r) => a + r.delta, 0);
  const holds = -ledger.filter((r) => r.reason === "reservation").reduce((a, r) => a + r.delta, 0);
  const released = ledger.filter((r) => r.reason === "reservation_release").reduce((a, r) => a + r.delta, 0);
  const onHold = Math.max(0, holds - released);
  const videos = new Set(ledger.filter((r) => r.reason === "charge" && r.project_id).map((r) => r.project_id)).size;

  const stats = [
    { label: "Used", value: used, note: `${videos} ${videos === 1 ? "video" : "videos"}` },
    { label: "On hold now", value: onHold, note: onHold ? "For videos in progress" : "Nothing in progress" },
    { label: "Added", value: added, note: "Grants and refunds" },
  ];

  return (
    <main className="dots min-h-dvh">
      <div className="mx-auto max-w-[1100px] px-4 pt-8 pb-20 sm:px-8 lg:pt-10">
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] leading-tight font-semibold tracking-[-0.03em]">Credits</h1>
        <p className="mt-1 text-[15px] text-muted">One credit is one cent of generation cost.</p>

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="relative overflow-hidden rounded-[24px] bg-fg p-7 text-bg shadow-float">
            <div aria-hidden className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />
            <p className="relative flex items-center gap-2 text-[13px] font-medium text-bg/70"><Coins size={16} aria-hidden /> Balance</p>
            <p className="relative mt-3 text-[56px] leading-none font-semibold tracking-[-0.04em] tabular-nums">{balance.toLocaleString()}</p>
            <p className="relative mt-2 text-[14px] text-bg/70">About ${(balance / 100).toFixed(2)} of generation, roughly {Math.max(0, Math.floor(balance / 100))} Shorts at Budget</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col justify-between rounded-[20px] border border-line bg-surface p-4">
                <p className="text-[12px] font-medium text-muted">{s.label}</p>
                <div>
                  <p className="mt-3 text-[28px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{s.value.toLocaleString()}</p>
                  <p className="mt-1.5 text-[12px] text-muted">{s.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Receipt, title: "Priced first", body: "Every storyboard shows its cost before you approve it." },
            { icon: Lock, title: "Held, then charged", body: "Credits are held at approval and charged as each step finishes." },
            { icon: ArrowCounterClockwise, title: "Unused comes back", body: "Anything not used, including cancels and failures, returns automatically." },
          ].map((c) => (
            <div key={c.title} className="flex gap-3 rounded-[18px] border border-line bg-surface p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><c.icon size={17} aria-hidden /></span>
              <div>
                <p className="text-[14px] font-semibold">{c.title}</p>
                <p className="mt-0.5 text-[13px] text-muted">{c.body}</p>
              </div>
            </div>
          ))}
        </section>

        <CreditHistory rows={ledger} />
      </div>
    </main>
  );
}
