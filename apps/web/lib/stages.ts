// User-facing pipeline stages (docs/04 §5). Maps the project state machine onto six plain labels.

export const STAGES = [
  { key: "write", label: "Script", statuses: ["draft", "researching", "scripting", "awaiting_script_approval"] },
  { key: "plan", label: "Storyboard", statuses: ["planning", "awaiting_plan_approval"] },
  { key: "style", label: "Style", statuses: ["locking_style"] },
  { key: "voice", label: "Voice", statuses: ["narrating"] },
  { key: "scenes", label: "Scenes", statuses: ["generating_scenes"] },
  { key: "cut", label: "Final cut", statuses: ["assembling", "rendering"] },
] as const;

export function stageIndex(status: string): number {
  if (status === "completed") return STAGES.length;
  const i = STAGES.findIndex((s) => (s.statuses as readonly string[]).includes(status));
  return i < 0 ? 0 : i;
}

export const TERMINAL = new Set(["completed", "failed", "canceled", "paused_insufficient_credits"]);
export const WAITING = new Set(["awaiting_script_approval", "awaiting_plan_approval"]);

/** Short label for library cards and headers. */
export function statusLabel(status: string): string {
  switch (status) {
    case "completed": return "Ready";
    case "failed": return "Needs attention";
    case "canceled": return "Canceled";
    case "paused_insufficient_credits": return "Paused";
    case "awaiting_script_approval": return "Review script";
    case "awaiting_plan_approval": return "Review storyboard";
    case "draft": return "Draft";
    default: return STAGES[stageIndex(status)]?.label ?? "Working";
  }
}

export function formatLabel(format: string): string {
  return format === "short_9x16" ? "Short" : "Full";
}

export function relativeTime(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
