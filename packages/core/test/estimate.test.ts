import { describe, expect, it } from "vitest";
import { estimateProject, estimateScene, llmCostUsd, motionSeconds } from "../src/index.ts";

// the cat Short: 5 scenes, word counts from fixtures/llm/why-do-cats-purr.json
const scenes = [9, 15, 21, 15, 17];

describe("estimateProject", () => {
  it("prices the Standard cat Short at ~$2.16 + 15% buffer (actual paid: $2.04)", () => {
    const e = estimateProject({ scenes: scenes.map((w) => ({ words: w, animate: true })), characters: 1, quality: "standard", music: true,
      needsStyleFrame: true, needsCharacterSheets: true, motionRes: "480P" });
    expect(scenes.map(motionSeconds)).toEqual([5, 7, 9, 7, 8]); // H3 min 5s, +300ms crossfade, ceil
    expect(e.usd).toBeCloseTo(2.1606 * 1.15, 3);
    expect(e.credits).toBe(249);
    expect(e.usd).toBeGreaterThan(2.04); // estimate must cover what we actually paid
  });

  it("prices Budget (2 animated scenes) at ~$1.10, covering the $0.89 actually paid", () => {
    const animate = [true, false, false, true, false];
    const e = estimateProject({ scenes: scenes.map((w, i) => ({ words: w, animate: animate[i]! })), characters: 1, quality: "budget", music: true,
      needsStyleFrame: true, needsCharacterSheets: true, motionRes: "480P" });
    expect(e.usd).toBeGreaterThan(0.89 * 0.9);
    expect(e.usd).toBeLessThan(1.15);
  });

  it("skips style frame and sheets when they already exist", () => {
    const base = { scenes: [{ words: 10, animate: false }], characters: 2, quality: "budget" as const, music: false, motionRes: "480P" };
    const fresh = estimateProject({ ...base, needsStyleFrame: true, needsCharacterSheets: true });
    const reused = estimateProject({ ...base, needsStyleFrame: false, needsCharacterSheets: false });
    expect(fresh.usd - reused.usd).toBeCloseTo(0.045 * 3 * 1.15, 4);
  });
});

describe("estimateScene", () => {
  it("redoing an animated scene's keyframe also pays for new motion", () => {
    const e = estimateScene({ words: 21, animate: true }, "keyframe", "480P");
    expect(e.items.map((i) => i.label)).toEqual(["Keyframe", "Motion (9s)", "Retry buffer (15%)"]);
    expect(e.credits).toBe(Math.ceil((0.045 + 0.45) * 1.15 * 100));
  });

  it("motion-only redo of a still scene costs nothing but the buffer", () => {
    expect(estimateScene({ words: 10, animate: false }, "motion", "480P").usd).toBe(0);
  });
});

describe("llmCostUsd", () => {
  it("prices Sonnet 5.5 tokens including cache reads", () => {
    expect(llmCostUsd("claude-sonnet-5-5", { input_tokens: 10_000, output_tokens: 2_000, cache_read_input_tokens: 5_000 })).toBeCloseTo(0.02 + 0.02 + 0.001, 6);
  });
});
