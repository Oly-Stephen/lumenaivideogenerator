import { describe, expect, it } from "vitest";
import { alignTokens, estimateUsd, getPreset, PlanSchema, renderStyleSystemPrompt, tokenize, validatePlanAgainstTokens } from "../src/index.ts";

describe("tokenize", () => {
  it("splits narration into spoken tokens and drops punctuation-only pieces", () => {
    expect(tokenize("Cats purr — even when hurt. 25 Hz!")).toEqual(["Cats", "purr", "even", "when", "hurt.", "25", "Hz!"]);
  });
});

describe("alignTokens", () => {
  const stt = [
    { text: "Cats", start: 0.1, end: 0.4 },
    { text: "purr,", start: 0.45, end: 0.8 },
    { text: "even", start: 0.9, end: 1.1 },
    { text: "when", start: 1.15, end: 1.3 },
    { text: "hurt.", start: 1.35, end: 1.7 },
  ];

  it("maps exact matches to STT timings, keeping our spelling", () => {
    const out = alignTokens(["Cats", "purr", "even", "when", "hurt."], stt);
    expect(out.map((w) => w.text)).toEqual(["Cats", "purr", "even", "when", "hurt."]);
    expect(out[1]).toMatchObject({ startMs: 450, endMs: 800 });
  });

  it("handles STT mishearing (substitution) and a dropped token (interpolation)", () => {
    const misheard = [...stt];
    misheard[2] = { text: "eaven", start: 0.9, end: 1.1 };
    const out = alignTokens(["Cats", "purr", "even", "when", "really", "hurt."], misheard);
    expect(out[2]).toMatchObject({ startMs: 900, endMs: 1100 }); // substituted slot
    expect(out[4]!.startMs).toBeGreaterThanOrEqual(out[3]!.endMs); // interpolated, monotonic
    expect(out[4]!.endMs).toBeLessThanOrEqual(out[5]!.startMs);
  });

  it("is monotonic over a whole sentence", () => {
    const out = alignTokens(tokenize("Cats purr even when hurt."), stt);
    for (let i = 1; i < out.length; i++) expect(out[i]!.startMs).toBeGreaterThanOrEqual(out[i - 1]!.startMs);
  });
});

describe("plan validation", () => {
  const plan = PlanSchema.parse({
    characters: [{ ref_tag: "CHAR_A", name: "Miso", description: "a small orange tabby cat with a white chest, green eyes and a teal collar" }],
    scenes: [
      { word_start: 0, word_end: 2, shot_type: "close", visual_prompt: "a cat purring on a windowsill", motion_prompt: "slow push-in", characters: ["CHAR_A"] },
      { word_start: 3, word_end: 4, shot_type: "diagram", visual_prompt: "diagram of the larynx vibrating", motion_prompt: "gentle pan" },
    ],
  });

  it("accepts a contiguous plan covering every token", () => {
    expect(() => validatePlanAgainstTokens(plan, 5)).not.toThrow();
  });

  it("rejects plans that miss the final words", () => {
    expect(() => validatePlanAgainstTokens(plan, 7)).toThrow(/7 tokens/);
  });

  it("rejects unknown character tags", () => {
    const bad = { ...plan, scenes: [{ ...plan.scenes[0]!, characters: ["CHAR_B"] }, plan.scenes[1]!] };
    expect(() => validatePlanAgainstTokens(bad, 5)).toThrow(/CHAR_B/);
  });
});

describe("presets & pricing", () => {
  it("renders a style system prompt with palette and negatives", () => {
    const p = renderStyleSystemPrompt(getPreset("flat_editorial").spec);
    expect(p).toContain("#2A9D8F");
    expect(p).toContain("watermarks");
  });

  it("prices a 30s 480P H3 motion pass at $1.50", () => {
    expect(estimateUsd({ endpoint: "minimax/h3/image-to-video", seconds: 30, resolution: "480P" })).toBeCloseTo(1.5);
  });
});
