// Contracts for LLM outputs (docs/03 §7 T1–T3). The same shapes come from Claude (structured outputs) or the
// manual provider (hand-authored JSON while there is no API key).
import { z } from "zod";

export const ResearchSchema = z.object({
  candidates: z
    .array(
      z.object({
        premise: z.string().min(5),
        key_fact: z.string().min(5),
        source_urls: z.array(z.url()).min(1),
        why_care: z.string(),
        scores: z.object({
          curiosity: z.number().min(1).max(10),
          clarity: z.number().min(1).max(10),
          visual: z.number().min(1).max(10),
          evidence: z.number().min(1).max(10),
        }),
      }),
    )
    .min(1),
  pick_index: z.number().int().min(0),
  pick_reason: z.string(),
});
export type Research = z.infer<typeof ResearchSchema>;

export const ScriptSchema = z.object({
  title: z.string().min(3).max(100),
  hook: z.string().min(3),
  chapters: z
    .array(
      z.object({
        title: z.string(),
        beats: z.array(z.object({ text: z.string().min(1), is_hook: z.boolean().default(false) })).min(1),
      }),
    )
    .min(1),
  full_text: z.string().min(10),
  on_screen_terms: z.array(z.string()).max(6).default([]),
  pronunciation_hints: z.array(z.object({ term: z.string(), say_as: z.string() })).default([]),
  claims: z.array(z.object({ text: z.string(), source_url: z.url() })).default([]),
});
export type Script = z.infer<typeof ScriptSchema>;

export const CharacterSchema = z.object({
  ref_tag: z.string().regex(/^CHAR_[A-Z]$/),
  name: z.string(),
  description: z.string().min(20).max(400), // frozen; used verbatim in every prompt
});

export const PlanSceneSchema = z.object({
  word_start: z.number().int().min(0),
  word_end: z.number().int().min(0),
  shot_type: z.enum(["wide", "medium", "close", "diagram", "text_card"]),
  visual_prompt: z.string().min(10).max(600),
  motion_prompt: z.string().min(3).max(200),
  characters: z.array(z.string().regex(/^CHAR_[A-Z]$/)).default([]),
  location_key: z.string().nullable().default(null),
  on_screen_text: z.string().max(40).nullable().default(null),
  animate_priority: z.number().min(0).max(1).default(0.5),
});

export const PlanSchema = z.object({
  characters: z.array(CharacterSchema).max(4).default([]),
  scenes: z.array(PlanSceneSchema).min(1),
  music_prompt: z.string().min(5).default("light, curious instrumental underscore, no vocals, steady tempo"),
});
export type Plan = z.infer<typeof PlanSchema>;

/** Plan scenes must tile the narration tokens exactly: contiguous, no gaps, no overlap. */
export function validatePlanAgainstTokens(plan: Plan, tokenCount: number): void {
  const s = plan.scenes;
  if (s[0]!.word_start !== 0) throw new Error("first scene must start at word 0");
  for (let i = 0; i < s.length; i++) {
    if (s[i]!.word_end < s[i]!.word_start) throw new Error(`scene ${i} has negative span`);
    if (i > 0 && s[i]!.word_start !== s[i - 1]!.word_end + 1) throw new Error(`scene ${i} is not contiguous`);
  }
  if (s.at(-1)!.word_end !== tokenCount - 1) {
    throw new Error(`last scene ends at word ${s.at(-1)!.word_end}, narration has ${tokenCount} tokens`);
  }
  const tags = new Set(plan.characters.map((c) => c.ref_tag));
  s.forEach((sc, i) => sc.characters.forEach((t) => {
    if (!tags.has(t)) throw new Error(`scene ${i} references unknown ${t}`);
  }));
}
