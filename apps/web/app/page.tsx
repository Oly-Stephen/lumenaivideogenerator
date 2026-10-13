import { requireUser } from "@/lib/server";
import { Landing } from "./Landing";
import { Library, type LibraryItem } from "./Library";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { supabase, user } = await requireUser();
  if (!user) return <Landing />;

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, input_text, format, status, status_detail, progress, created_at, target_duration_s, style_preset, quality")
    .order("created_at", { ascending: false })
    .limit(60);

  const ids = (projects ?? []).map((p) => p.id);
  const { data: scenes } = ids.length
    ? await supabase.from("scenes").select("project_id, idx, keyframe_asset_id, end_ms").in("project_id", ids)
    : { data: [] };
  const thumb = new Map<string, string | null>();
  const length = new Map<string, number>();
  const count = new Map<string, number>();
  for (const s of scenes ?? []) {
    if (s.idx === 0) thumb.set(s.project_id, s.keyframe_asset_id);
    if (s.end_ms) length.set(s.project_id, Math.max(length.get(s.project_id) ?? 0, s.end_ms));
    count.set(s.project_id, (count.get(s.project_id) ?? 0) + 1);
  }

  const items: LibraryItem[] = (projects ?? []).map((p) => ({
    ...p,
    thumb: thumb.get(p.id) ?? null,
    lengthMs: length.get(p.id) ?? null,
    sceneCount: count.get(p.id) ?? 0,
  }));
  return <Library initial={items} />;
}
