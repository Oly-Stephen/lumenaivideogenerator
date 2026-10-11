import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server";
import { ProjectLive } from "./ProjectLive";
import { PROJECT_COLUMNS, type Project } from "./types";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: project } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();
  return <ProjectLive initial={project as Project} />;
}
