// LLM provider (docs/03 §7, D013, M2 plan Part A). Two implementations behind one interface:
//  - claude: Claude API — research (web search) + script + scene plan, model per step (Sonnet 5.5 default, Opus 5.5 "high")
//  - manual: research/script/plan authored in the dev session (fixtures/llm/*.json); used when no ANTHROPIC_API_KEY
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  llmCostUsd, PlanSchema, ResearchSchema, ScriptSchema, targetWordCount, tokenize, validatePlanAgainstTokens,
  type LlmUsage, type Plan, type Research, type Script,
} from "@lumen/core";
import {
  indexTokens, planUser, PLAN_SYSTEM, PROMPT_VERSION, RESEARCH_SYSTEM, researchUser, SCRIPT_SYSTEM, scriptUser,
} from "@lumen/prompts";

export class AwaitingAuthorError extends Error {}

export interface ProjectBrief {
  projectId: string;
  mode: "topic" | "script";
  text: string;
  format: "short_9x16" | "full_16x9";
  durationS: number;
  language: string;
  llmTier: "standard" | "high";
  styleSummary: string;
  maxScenes: number;
}

export interface UsageRecord {
  kind: "llm_research" | "llm_script" | "llm_plan";
  model: string;
  usage: LlmUsage;
  costUsd: number;
  promptVersion: string;
}
export type Track = (u: UsageRecord) => Promise<void>;

export interface ScriptResult {
  research: { notes: string; sources: string[]; structured?: Research | null } | null;
  script: Script;
  source: string;
}

export interface LlmProvider {
  name: string;
  produceScript(b: ProjectBrief, track: Track): Promise<ScriptResult>;
  producePlan(b: ProjectBrief, script: Script, track: Track): Promise<Plan>;
}

export function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, "-");
}

/** A user-supplied script becomes a single-chapter Script without an LLM call (text kept verbatim). */
export function scriptFromUserText(text: string): Script {
  const full = text.replace(/\s+/g, " ").trim();
  const sentences = full.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [full];
  const first = sentences[0] ?? full;
  return ScriptSchema.parse({
    title: first.length > 90 ? `${first.slice(0, 87)}…` : first,
    hook: first,
    chapters: [{ title: "Main", beats: sentences.map((t, i) => ({ text: t, is_hook: i === 0 })) }],
    full_text: full,
  });
}

// ---------------------------------------------------------------- smart remap (manual mode, edited scripts)
function sentenceStarts(tokens: string[]): number[] {
  const starts = [0];
  tokens.forEach((t, i) => { if (/[.!?]["')\]]*$/.test(t) && i + 1 < tokens.length) starts.push(i + 1); });
  return starts;
}

/**
 * Re-maps an authored plan onto an edited script when the sentence count is unchanged:
 * each scene keeps its visuals; its word range moves proportionally within the matching sentences.
 * Returns null when the structure changed too much (sentence count differs).
 */
export function remapPlan(plan: Plan, oldText: string, newText: string): Plan | null {
  const oldT = tokenize(oldText), newT = tokenize(newText);
  const os = sentenceStarts(oldT), ns = sentenceStarts(newT);
  if (os.length !== ns.length) return null;
  const sentenceOf = (starts: number[], i: number) => { let s = 0; while (s + 1 < starts.length && starts[s + 1]! <= i) s++; return s; };
  const lenOf = (starts: number[], total: number, s: number) => (s + 1 < starts.length ? starts[s + 1]! : total) - starts[s]!;
  const mapIdx = (i: number) => {
    const s = sentenceOf(os, i);
    const ratio = (i - os[s]!) / lenOf(os, oldT.length, s);
    return ns[s]! + Math.round(ratio * lenOf(ns, newT.length, s));
  };
  const scenes = plan.scenes.map((sc, k) => ({ ...sc, word_start: k === 0 ? 0 : mapIdx(sc.word_start) }));
  for (let k = 0; k < scenes.length; k++) {
    scenes[k]!.word_end = k + 1 < scenes.length ? scenes[k + 1]!.word_start - 1 : newT.length - 1;
    if (scenes[k]!.word_end < scenes[k]!.word_start) return null;
  }
  const out = { ...plan, scenes };
  try { validatePlanAgainstTokens(out, newT.length); } catch { return null; }
  return out;
}

// ---------------------------------------------------------------- manual provider
interface Fixture { project_id?: string; topic_match?: string[]; research?: unknown; script: unknown; plan: unknown }

export class ManualLlmProvider implements LlmProvider {
  name = "manual";
  constructor(private dir: string) {}

  private async find(b: ProjectBrief): Promise<{ f: string; j: Fixture } | null> {
    const llmDir = join(this.dir, "llm");
    const files = (await readdir(llmDir).catch(() => [])).filter((f) => f.endsWith(".json"));
    const want = slugify(b.text);
    for (const f of files) {
      const j = JSON.parse(await readFile(join(llmDir, f), "utf8")) as Fixture;
      if (j.project_id === b.projectId || f === `${b.projectId}.json` || (j.topic_match ?? []).some((t) => want.includes(slugify(t)))) return { f, j };
    }
    return null;
  }

  async produceScript(b: ProjectBrief): Promise<ScriptResult> {
    if (b.mode === "script") return { research: null, script: scriptFromUserText(b.text), source: "manual:user-script" };
    const hit = await this.find(b);
    if (!hit) throw new AwaitingAuthorError(`Manual LLM mode: no authored script yet for "${b.text.slice(0, 60)}". Add ANTHROPIC_API_KEY or author fixtures/llm/${b.projectId}.json`);
    const research = hit.j.research ? ResearchSchema.parse(hit.j.research) : null;
    return { research: research ? { notes: "", sources: research.candidates.flatMap((c) => c.source_urls), structured: research } : null,
      script: ScriptSchema.parse(hit.j.script), source: `manual:${hit.f}` };
  }

  async producePlan(b: ProjectBrief, script: Script): Promise<Plan> {
    const hit = await this.find(b);
    if (!hit) throw new AwaitingAuthorError(`Manual LLM mode: no authored plan yet. Add ANTHROPIC_API_KEY or author fixtures/llm/${b.projectId}.json`);
    const plan = PlanSchema.parse(hit.j.plan);
    const authored = ScriptSchema.parse(hit.j.script).full_text;
    if (authored.replace(/\s+/g, " ").trim() === script.full_text.replace(/\s+/g, " ").trim()) return plan;
    const remapped = remapPlan(plan, authored, script.full_text);
    if (remapped) return remapped;
    throw new AwaitingAuthorError("Manual LLM mode: the edited script changed its sentence structure, so the plan needs re-authoring (or add ANTHROPIC_API_KEY).");
  }
}

// ---------------------------------------------------------------- Claude provider
export interface ClaudeModels { research: string; script: string; plan: string; high: string }

const FALLBACK_MODELS = new Set(["claude-sonnet-5-5", "claude-opus-5-5"]); // server-side fallback "default" form

export class ClaudeLlmProvider implements LlmProvider {
  name = "claude";
  private client: Anthropic;
  constructor(apiKey: string, private models: ClaudeModels, workspaceId?: string) {
    // keys not scoped to a workspace must name the workspace on every request
    this.client = new Anthropic({ apiKey, maxRetries: 3, defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined });
  }

  private model(step: keyof Omit<ClaudeModels, "high">, b: ProjectBrief): string {
    return b.llmTier === "high" ? this.models.high : this.models[step];
  }

  private safety(model: string) {
    return FALLBACK_MODELS.has(model) ? { fallbacks: "default" as const, betas: ["server-side-fallback-2026-07-01"] } : { betas: [] as string[] };
  }

  private async record(track: Track, kind: UsageRecord["kind"], model: string, usage: LlmUsage): Promise<void> {
    await track({ kind, model, usage, costUsd: llmCostUsd(model, usage), promptVersion: PROMPT_VERSION });
  }

  async produceScript(b: ProjectBrief, track: Track): Promise<ScriptResult> {
    if (b.mode === "script") return { research: null, script: scriptFromUserText(b.text), source: "user-script" };

    // T1 research — web search, free text (structured outputs can't combine with citations)
    const rModel = this.model("research", b);
    const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [
      { role: "user", content: researchUser({ topic: b.text, durationS: b.durationS, language: b.language }) },
    ];
    let notes = "";
    const sources = new Set<string>();
    for (let turn = 0; turn < 4; turn++) {
      const res = await this.client.beta.messages.stream({
        model: rModel, max_tokens: 16000, system: RESEARCH_SYSTEM, messages,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
        output_config: { effort: "high" },
        ...this.safety(rModel),
      }).finalMessage();
      await this.record(track, "llm_research", rModel, res.usage as LlmUsage);
      if (res.stop_reason === "refusal") throw new Error("Claude declined to research this topic");
      for (const block of res.content) {
        if (block.type === "text") {
          notes += block.text;
          for (const c of (block as { citations?: { url?: string }[] | null }).citations ?? []) if (c.url) sources.add(c.url);
        }
        if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
          for (const r of block.content as { url?: string }[]) if (r.url) sources.add(r.url);
        }
      }
      if (res.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: res.content as Anthropic.Beta.Messages.BetaContentBlockParam[] }); // continue a paused server-tool turn
    }
    if (!notes.trim()) throw new Error("research returned no notes");

    // T2 script — structured output validated by ScriptSchema
    const sModel = this.model("script", b);
    const parsed = await this.client.beta.messages.parse({
      model: sModel, max_tokens: 16000, system: SCRIPT_SYSTEM,
      messages: [{ role: "user", content: scriptUser({ notes, topic: b.text, format: b.format === "short_9x16" ? "short" : "full", targetWords: targetWordCount(b.durationS) }) }],
      output_config: { effort: "high", format: zodOutputFormat(ScriptSchema) },
      ...this.safety(sModel),
    });
    await this.record(track, "llm_script", sModel, parsed.usage as LlmUsage);
    if (parsed.stop_reason === "refusal") throw new Error("Claude declined to write this script");
    if (!parsed.parsed_output) throw new Error(`script output did not match the schema (stop_reason ${parsed.stop_reason})`);
    return { research: { notes, sources: [...sources] }, script: parsed.parsed_output, source: `claude:${sModel}` };
  }

  async producePlan(b: ProjectBrief, script: Script, track: Track): Promise<Plan> {
    const tokens = tokenize(script.full_text);
    const sceneSeconds: [number, number] = b.format === "short_9x16" ? [3.5, 8] : [4, 10];
    const base = planUser({ indexedTokens: indexTokens(tokens), tokenCount: tokens.length, aspect: b.format === "short_9x16" ? "9:16" : "16:9",
      styleSummary: b.styleSummary, sceneSeconds, maxScenes: b.maxScenes });
    let lastError = "";
    // Sonnet (or Opus when llm_tier=high) gets two tries; then escalate to Opus once (M2 plan Part A)
    const attempts = [this.model("plan", b), this.model("plan", b), this.models.high];
    for (const model of attempts) {
      const content = lastError ? `${base}\n\nYour previous plan was rejected: ${lastError}\nFix it and return the full plan again.` : base;
      const res = await this.client.beta.messages.parse({
        model, max_tokens: 16000, system: PLAN_SYSTEM, messages: [{ role: "user", content }],
        output_config: { effort: "medium", format: zodOutputFormat(PlanSchema) },
        ...this.safety(model),
      });
      await this.record(track, "llm_plan", model, res.usage as LlmUsage);
      if (res.stop_reason === "refusal") throw new Error("Claude declined to plan this video");
      const plan = res.parsed_output;
      if (!plan) { lastError = `output did not match the schema (stop_reason ${res.stop_reason})`; continue; }
      try {
        validatePlanAgainstTokens(plan, tokens.length);
        if (plan.scenes.length > b.maxScenes) throw new Error(`too many scenes (${plan.scenes.length} > ${b.maxScenes})`);
        return plan;
      } catch (e) {
        lastError = (e as Error).message;
      }
    }
    throw new Error(`scene plan failed validation: ${lastError}`);
  }
}

/** mock mode and LLM_PROVIDER=manual never call Claude ($0 tests); otherwise Claude when a key is present. */
export function createLlmProvider(fixturesDir: string, mode: string): LlmProvider {
  const key = process.env.ANTHROPIC_API_KEY?.replace(/\s+#.*$/, "").trim();
  const forced = process.env.LLM_PROVIDER?.trim();
  if (!key || mode === "mock" || forced === "manual") return new ManualLlmProvider(fixturesDir);
  const env = (k: string, d: string) => process.env[k]?.replace(/\s+#.*$/, "").trim() || d;
  return new ClaudeLlmProvider(key, {
    research: env("LLM_MODEL_RESEARCH", "claude-sonnet-5-5"),
    script: env("LLM_MODEL_SCRIPT", "claude-sonnet-5-5"),
    plan: env("LLM_MODEL_PLAN", "claude-sonnet-5-5"),
    high: env("LLM_MODEL_HIGH", "claude-opus-5-5"),
  }, env("ANTHROPIC_WORKSPACE_ID", "") || undefined);
}
