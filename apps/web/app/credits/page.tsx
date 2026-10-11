import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server";

export const dynamic = "force-dynamic";

const REASON: Record<string, string> = {
  grant: "Grant", purchase: "Purchase", reservation: "Held for generation", reservation_release: "Hold released",
  charge: "Charged", refund: "Refund", adjustment: "Adjustment",
};

export default async function CreditsPage() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const { data: rows } = await supabase
    .from("credits_ledger")
    .select("id, created_at, reason, delta, note, project_id, projects(title)")
    .order("id", { ascending: true })
    .limit(500);

  let running = 0;
  const withBalance = (rows ?? []).map((r) => ({ ...r, balance: (running += r.delta) }));
  const view = withBalance.reverse();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Credits</h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        1 credit = $0.01 of generation cost. Credits are held when you approve a plan, charged per finished step, and any unused hold is released.
      </p>
      <p className="mt-4 text-lg">Balance: <span className="font-semibold">{running.toLocaleString()}</span> credits</p>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-[color:var(--muted)]">
            <tr><th className="py-2">When</th><th>What</th><th>Video</th><th className="text-right">Change</th><th className="text-right">Balance</th></tr>
          </thead>
          <tbody className="divide-y divide-black/10 dark:divide-white/10">
            {view.map((r) => {
              // to-one embed; typed as an array by the untyped client
              const rel = r.projects as unknown as { title: string | null } | { title: string | null }[] | null;
              const title = Array.isArray(rel) ? rel[0]?.title : rel?.title;
              return (
                <tr key={r.id}>
                  <td className="py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td>{REASON[r.reason] ?? r.reason}{r.note ? <span className="block text-xs text-[color:var(--muted)]">{r.note}</span> : null}</td>
                  <td className="max-w-[200px] truncate">{r.project_id ? <Link className="underline" href={`/projects/${r.project_id}`}>{title ?? "video"}</Link> : "—"}</td>
                  <td className={`text-right tabular-nums ${r.delta < 0 ? "" : "text-emerald-600"}`}>{r.delta > 0 ? "+" : ""}{r.delta}</td>
                  <td className="text-right tabular-nums">{r.balance}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
