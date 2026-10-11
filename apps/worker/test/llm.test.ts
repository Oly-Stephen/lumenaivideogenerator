import { describe, expect, it } from "vitest";
import { PlanSchema, tokenize, validatePlanAgainstTokens } from "@lumen/core";
import { remapPlan, scriptFromUserText } from "../src/providers/llm.ts";

const oldText = "Cats purr when happy. They also purr when hurt. Scientists found pads in their throats.";
const plan = PlanSchema.parse({
  characters: [],
  scenes: [
    { word_start: 0, word_end: 3, shot_type: "close", visual_prompt: "a happy cat purring", motion_prompt: "push-in" },
    { word_start: 4, word_end: 8, shot_type: "medium", visual_prompt: "an injured cat purring softly", motion_prompt: "pan" },
    { word_start: 9, word_end: 14, shot_type: "diagram", visual_prompt: "throat cross-section with pads", motion_prompt: "push-in" },
  ],
});

describe("remapPlan (manual mode script edits)", () => {
  it("keeps visuals and recomputes word ranges when sentence count is unchanged", () => {
    const edited = "Cats purr whenever they feel truly happy. They also purr when hurt. Vienna scientists found tiny pads inside their throats.";
    const out = remapPlan(plan, oldText, edited)!;
    expect(out).not.toBeNull();
    expect(out.scenes.map((s) => s.visual_prompt)).toEqual(plan.scenes.map((s) => s.visual_prompt));
    expect(() => validatePlanAgainstTokens(out, tokenize(edited).length)).not.toThrow();
    expect(out.scenes[1]!.word_start).toBe(7); // second sentence now starts at token 7
  });

  it("refuses when sentences were added or removed", () => {
    expect(remapPlan(plan, oldText, "Cats purr. A lot. When hurt too. And pads exist.")).toBeNull();
  });
});

describe("scriptFromUserText", () => {
  it("keeps the user's narration verbatim and splits beats by sentence", () => {
    const s = scriptFromUserText("Octopuses have three hearts!  Two pump blood to the gills. One pumps it everywhere else.");
    expect(s.full_text).toBe("Octopuses have three hearts! Two pump blood to the gills. One pumps it everywhere else.");
    expect(s.chapters[0]!.beats.map((b) => b.text)).toHaveLength(3);
    expect(s.hook).toBe("Octopuses have three hearts!");
  });
});
