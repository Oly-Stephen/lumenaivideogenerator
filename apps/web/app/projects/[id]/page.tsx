import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server";
import { ProjectLive } from "./ProjectLive";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, input_text, format, quality, status, status_detail, progress, final_render_id, error")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();
  return <ProjectLive initial={project} />;
}
