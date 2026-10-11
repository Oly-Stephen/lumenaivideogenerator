// Project & scene state machines (docs/03 §3.1, §3.2). The SQL `advance_project` mirrors these tables;
// keeping them here lets the web app and worker validate transitions and tests pin the contract.

export const PROJECT_STATUSES = [
  "draft",
  "researching",
  "scripting",
  "awaiting_script_approval",
  "planning",
  "awaiting_plan_approval",
  "locking_style",
  "narrating",
  "generating_scenes",
  "assembling",
  "rendering",
  "completed",
  "failed",
  "canceled",
  "paused_insufficient_credits",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const SCENE_STATUSES = [
  "pending",
  "keyframe_queued",
  "keyframe_ready",
  "motion_queued",
  "motion_ready",
  "ready",
  "failed",
  "needs_review",
] as const;
export type SceneStatus = (typeof SCENE_STATUSES)[number];

const FAILABLE: ProjectStatus[] = [
  "researching",
  "scripting",
  "planning",
  "locking_style",
  "narrating",
  "generating_scenes",
  "assembling",
  "rendering",
];
const CANCELABLE: ProjectStatus[] = [
  "draft",
  "awaiting_script_approval",
  "awaiting_plan_approval",
  "researching",
  "scripting",
  "planning",
  "locking_style",
  "narrating",
  "generating_scenes",
  "paused_insufficient_credits",
];

const PROJECT_EDGES: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ["researching", "scripting"],
  researching: ["scripting"],
  scripting: ["awaiting_script_approval", "planning"], // planning directly when autopilot
  awaiting_script_approval: ["scripting", "planning"],
  planning: ["awaiting_plan_approval", "locking_style"], // locking_style directly when autopilot
  awaiting_plan_approval: ["planning", "locking_style"],
  locking_style: ["narrating"],
  narrating: ["generating_scenes"],
  generating_scenes: ["assembling", "paused_insufficient_credits"],
  paused_insufficient_credits: ["generating_scenes"],
  assembling: ["rendering"],
  rendering: ["completed"],
  completed: ["generating_scenes", "narrating"], // partial redo / narration edit
  failed: [],
  canceled: [],
};

export function canTransitionProject(from: ProjectStatus, to: ProjectStatus): boolean {
  if (to === "failed") return FAILABLE.includes(from);
  if (to === "canceled") return CANCELABLE.includes(from);
  return PROJECT_EDGES[from].includes(to);
}

export function assertProjectTransition(from: ProjectStatus, to: ProjectStatus): void {
  if (!canTransitionProject(from, to)) throw new Error(`illegal project transition ${from} -> ${to}`);
}

const SCENE_EDGES: Record<SceneStatus, SceneStatus[]> = {
  pending: ["keyframe_queued", "motion_queued"],
  keyframe_queued: ["keyframe_ready", "failed"],
  keyframe_ready: ["motion_queued", "ready", "needs_review"],
  motion_queued: ["motion_ready", "failed"],
  motion_ready: ["ready"],
  ready: ["pending"],
  failed: ["pending"],
  needs_review: ["pending", "ready"],
};

export function canTransitionScene(from: SceneStatus, to: SceneStatus): boolean {
  return SCENE_EDGES[from].includes(to);
}

/** Human checkpoints are skipped when the project runs on autopilot (30s tests). */
export function nextAfterScripting(autopilot: boolean): ProjectStatus {
  return autopilot ? "planning" : "awaiting_script_approval";
}
export function nextAfterPlanning(autopilot: boolean): ProjectStatus {
  return autopilot ? "locking_style" : "awaiting_plan_approval";
}

export const TERMINAL: ReadonlySet<ProjectStatus> = new Set(["completed", "failed", "canceled"]);
