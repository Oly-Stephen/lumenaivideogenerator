import { STYLE_PRESETS } from "@lumen/core";
import { requireUser } from "@/lib/server";
import { CreateForm } from "./CreateForm";

export const dynamic = "force-dynamic";

export default async function NewPage() {
  const { supabase } = await requireUser();
  const [{ data: voices }, { data: cfg }] = await Promise.all([
    supabase.from("voices").select("id, name").order("name"),
    supabase.from("app_config").select("max_test_duration_s").single(),
  ]);
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">New video</h1>
      <CreateForm
        voices={voices ?? []}
        presets={STYLE_PRESETS.map((p) => ({ key: p.key, name: p.name, blurb: p.blurb, swatch: p.spec.palette }))}
        maxDuration={cfg?.max_test_duration_s ?? 30}
      />
    </main>
  );
}
