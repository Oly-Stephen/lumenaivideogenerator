import { STYLE_PRESETS } from "@lumen/core";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server";
import { CreateForm } from "./CreateForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New video" };

export default async function NewPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const [{ data: voices }, { data: cfg }, { data: bal }, { topic }] = await Promise.all([
    supabase.from("voices").select("id, name").order("name"),
    supabase.from("app_config").select("max_test_duration_s").single(),
    supabase.from("credit_balances").select("balance").maybeSingle(),
    searchParams,
  ]);
  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 pb-40 sm:px-6 sm:pt-12">
      <h1 className="display">New video</h1>
      <p className="mt-1 text-muted">You will review the script and storyboard before anything is generated.</p>
      <CreateForm
        voices={voices ?? []}
        presets={STYLE_PRESETS.map((p) => ({ key: p.key, name: p.name, blurb: p.blurb, swatch: p.spec.palette }))}
        maxDuration={cfg?.max_test_duration_s ?? 30}
        balance={bal?.balance ?? 0}
        initialTopic={topic?.slice(0, 300) ?? ""}
      />
    </main>
  );
}
