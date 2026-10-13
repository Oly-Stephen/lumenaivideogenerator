import { requireUser } from "@/lib/server";
import { Landing } from "./Landing";
import { Library, type LibraryItem } from "./Library";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { supabase, user } = await requireUser();
  if (!user) return <Landing />;

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, input_text, format, status, status_detail, progress, created_at")
    .order("created_at", { ascending: false })
    .limit(60);

  const ids = (projects ?? []).map((p) => p.id);
  const { data: firsts } = ids.length
    ? await supabase.from("scenes").select("project_id, keyframe_asset_id").in("project_id", ids).eq("idx", 0)
    : { data: [] };
  const thumb = new Map((firsts ?? []).map((s) => [s.project_id as string, s.keyframe_asset_id as string | null]));

  const items: LibraryItem[] = (projects ?? []).map((p) => ({ ...p, thumb: thumb.get(p.id) ?? null }));
  return <Library initial={items} />;
}
