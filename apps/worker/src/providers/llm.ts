// LLM provider. Two implementations behind one interface (D013):
//  - manual: research/script/plan authored by Claude in the dev session, stored in fixtures/llm/<slug>.json
//  - claude: Claude API (claude-opus-5-5) — enabled once ANTHROPIC_API_KEY is set (not built yet)
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { PlanSchema, ResearchSchema, ScriptSchema, type Plan, type Research, type Script } from "@lumen/core";

export interface LlmBundle {
  research: Research | null;
  script: Script;
  plan: Plan;
  source: string;
}

export class AwaitingAuthorError extends Error {}

export function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, "-");
}

export interface LlmProvider {
  name: string;
  /** Returns research (topic mode), script and plan for a project. */
  produce(input: { projectId: string; mode: "topic" | "script"; text: string }): Promise<LlmBundle>;
}

export class ManualLlmProvider implements LlmProvider {
  name = "manual";
  constructor(private dir: string) {}

  async produce(input: { projectId: string; mode: "topic" | "script"; text: string }): Promise<LlmBundle> {
    const llmDir = join(this.dir, "llm");
    const files = (await readdir(llmDir).catch(() => [])).filter((f) => f.endsWith(".json"));
    const want = slugify(input.text);
    for (const f of files) {
      const j = JSON.parse(await readFile(join(llmDir, f), "utf8")) as { project_id?: string; topic_match?: string[] };
      const matches = j.project_id === input.projectId || f === `${input.projectId}.json` ||
        (j.topic_match ?? []).some((t) => want.includes(slugify(t)));
      if (!matches) continue;
      const raw = j as { research?: unknown; script: unknown; plan: unknown };
      return {
        research: raw.research ? ResearchSchema.parse(raw.research) : null,
        script: ScriptSchema.parse(raw.script),
        plan: PlanSchema.parse(raw.plan),
        source: `manual:${f}`,
      };
    }
    throw new AwaitingAuthorError(
      `Manual LLM mode: no authored script yet for "${input.text.slice(0, 60)}". Ask Claude (dev session) to author fixtures/llm/${input.projectId}.json`,
    );
  }
}

export function createLlmProvider(fixturesDir: string): LlmProvider {
  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    // Claude provider lands when the key is added; manual stays the default until then.
    console.warn("ANTHROPIC_API_KEY is set but the Claude provider is not wired yet — using manual mode");
  }
  return new ManualLlmProvider(fixturesDir);
}
