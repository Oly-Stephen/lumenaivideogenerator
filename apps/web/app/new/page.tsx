import { STYLE_PRESETS } from "@lumen/core";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server";
import { CreateForm } from "./CreateForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create" };

export default async function NewPage({ searchParams }: { searchParams: Promise<{ topic?: string; format?: string }> }) {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login?next=/new");
  const [{ data: voices }, { data: cfg }, { data: bal }, { topic, format }] = await Promise.all([
    supabase.from("voices").select("id, name").order("name"),
    supabase.from("app_config").select("max_test_duration_s").single(),
    supabase.from("credit_balances").select("balance").maybeSingle(),
    searchParams,
  ]);
  // Every style has a sample frame in public/styles (scripts/export-style-samples.ts, generate-style-samples.ts).
  // Served statically; not checked on disk, because hosted servers (Vercel) don't ship public/ with the function.
  const presets = STYLE_PRESETS.map((p) => ({
    key: p.key, name: p.name, blurb: p.blurb, swatch: p.spec.palette, image: `/styles/${p.key}.jpg`,
  }));
  return (
    <CreateForm
      voices={voices ?? []}
      presets={presets}
      maxDuration={cfg?.max_test_duration_s ?? 30}
      balance={bal?.balance ?? 0}
      initialTopic={topic?.slice(0, 300) ?? ""}
      initialFormat={format === "full" ? "full_16x9" : "short_9x16"}
    />
  );
}
