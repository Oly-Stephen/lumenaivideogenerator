import { existsSync } from "node:fs";
import path from "node:path";
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
  // Real sample frames exported from finished videos (scripts/export-style-samples.ts); others use their palette.
  const stylesDir = path.join(process.cwd(), "public", "styles");
  const presets = STYLE_PRESETS.map((p) => ({
    key: p.key, name: p.name, blurb: p.blurb, swatch: p.spec.palette,
    image: existsSync(path.join(stylesDir, `${p.key}.jpg`)) ? `/styles/${p.key}.jpg` : null,
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
