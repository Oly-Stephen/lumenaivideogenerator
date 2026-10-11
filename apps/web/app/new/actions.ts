"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server";

export interface CreateState {
  error?: string;
}

export async function createProject(_prev: CreateState, form: FormData): Promise<CreateState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Please sign in again." };

  const text = String(form.get("input_text") ?? "").trim();
  if (!text) return { error: "Describe a topic or paste a script." };
  const format = form.get("format") === "full_16x9" ? "full_16x9" : "short_9x16";
  const quality = form.get("quality") === "budget" ? "budget" : "standard";

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      input_mode: form.get("input_mode") === "script" ? "script" : "topic",
      input_text: text,
      format,
      target_duration_s: Number(form.get("target_duration_s") ?? 30),
      quality,
      style_preset: String(form.get("style_preset") ?? "flat_editorial"),
      voice_id: String(form.get("voice_id") ?? "") || null,
      subtitles: form.get("subtitles") === "on",
      music: form.get("music") === "on",
      autopilot: true,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create the project." };

  const { error: startErr } = await supabase.rpc("rpc_start_project", { p_project_id: data.id });
  if (startErr) return { error: startErr.message };
  redirect(`/projects/${data.id}`);
}
