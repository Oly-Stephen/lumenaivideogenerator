import Link from "next/link";
import { requireUser } from "@/lib/server";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", completed: "Ready", failed: "Failed", canceled: "Canceled", paused_insufficient_credits: "Paused (budget)",
};

export default async function Home() {
  const { supabase, user } = await requireUser();
  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20">
        <h1 className="text-3xl font-semibold">Lumen</h1>
        <p className="mt-2 text-[color:var(--muted)]">Narrated explainer videos from a topic or a script — Short (9:16) and Full (16:9).</p>
        <Link href="/login" className="mt-8 inline-block rounded-md bg-[color:var(--accent)] px-4 py-2 font-medium text-white">Sign in</Link>
      </main>
    );
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, input_text, format, status, progress, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Your videos</h1>
        <Link href="/new" className="rounded-md bg-[color:var(--accent)] px-4 py-2 font-medium text-white">New video</Link>
      </div>
      <ul className="mt-6 divide-y divide-black/10 dark:divide-white/10">
        {(projects ?? []).map((p) => (
          <li key={p.id}>
            <Link href={`/projects/${p.id}`} className="flex items-center justify-between gap-4 py-3">
              <span className="min-w-0">
                <span className="block truncate font-medium">{p.title ?? p.input_text}</span>
                <span className="text-xs text-[color:var(--muted)]">{p.format === "short_9x16" ? "Short · 9:16" : "Full · 16:9"}</span>
              </span>
              <span className="shrink-0 text-sm text-[color:var(--muted)]">{STATUS_LABEL[p.status] ?? `${Math.round(Number(p.progress))}%`}</span>
            </Link>
          </li>
        ))}
        {!projects?.length && <li className="py-6 text-[color:var(--muted)]">No videos yet.</li>}
      </ul>
    </main>
  );
}
