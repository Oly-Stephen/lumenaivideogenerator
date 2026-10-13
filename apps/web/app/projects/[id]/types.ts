export interface Project {
  id: string;
  title: string | null;
  input_text: string;
  format: string;
  quality: string;
  status: string;
  status_detail: string | null;
  progress: number;
  final_render_id: string | null;
  current_script_id: string | null;
  estimate: { items: { label: string; usd: number }[]; usd: number; credits: number } | null;
  estimate_credits: number | null;
  spent_credits: number;
  target_duration_s: number;
  style_preset: string | null;
  created_at: string;
  error: unknown;
}

export interface Scene {
  id: string;
  idx: number;
  revision: number;
  narration: string;
  status: string;
  animate: boolean;
  shot_type: string;
  visual_prompt: string;
  motion_prompt: string | null;
  word_start: number;
  word_end: number;
  keyframe_asset_id: string | null;
  clip_asset_id: string | null;
  start_ms: number | null;
  end_ms: number | null;
  error: { degraded?: boolean } | null;
}

export const PROJECT_COLUMNS =
  "id, title, input_text, format, quality, status, status_detail, progress, final_render_id, current_script_id, estimate, estimate_credits, spent_credits, target_duration_s, style_preset, created_at, error";
export const SCENE_COLUMNS =
  "id, idx, revision, narration, status, animate, shot_type, visual_prompt, motion_prompt, word_start, word_end, keyframe_asset_id, clip_asset_id, start_ms, end_ms, error";
