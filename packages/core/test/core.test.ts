import { describe, expect, it } from "vitest";
import {
  canTransitionProject,
  canTransitionScene,
  canonicalJson,
  deriveSeed,
  fitClip,
  jobIdempotencyKey,
  nextAfterScripting,
  requestDurationS,
  targetWordCount,
  timeScenes,
  type AlignedWord,
} from "../src/index.ts";

describe("project state machine", () => {
  it("follows the happy path", () => {
    const path = [
      "draft", "researching", "scripting", "awaiting_script_approval", "planning", "awaiting_plan_approval",
      "locking_style", "narrating", "generating_scenes", "assembling", "rendering", "completed",
    ] as const;
    for (let i = 1; i < path.length; i++) expect(canTransitionProject(path[i - 1]!, path[i]!)).toBe(true);
  });

  it("blocks skipping steps and leaving terminal states", () => {
    expect(canTransitionProject("draft", "rendering")).toBe(false);
    expect(canTransitionProject("completed", "failed")).toBe(false);
    expect(canTransitionProject("canceled", "draft")).toBe(false);
  });

  it("allows partial redo from completed and cancel while generating", () => {
    expect(canTransitionProject("completed", "generating_scenes")).toBe(true);
    expect(canTransitionProject("generating_scenes", "canceled")).toBe(true);
    expect(canTransitionProject("rendering", "canceled")).toBe(false);
  });

  it("autopilot skips the approval checkpoints", () => {
    expect(nextAfterScripting(true)).toBe("planning");
    expect(canTransitionProject("scripting", nextAfterScripting(true))).toBe(true);
  });
});

describe("scene state machine", () => {
  it("supports keyframe-first and premium paths", () => {
    expect(canTransitionScene("pending", "keyframe_queued")).toBe(true);
    expect(canTransitionScene("pending", "motion_queued")).toBe(true);
    expect(canTransitionScene("keyframe_ready", "ready")).toBe(true); // Ken Burns
    expect(canTransitionScene("ready", "pending")).toBe(true); // redo
    expect(canTransitionScene("pending", "ready")).toBe(false);
  });
});

describe("idempotency & seeds", () => {
  it("canonical JSON ignores key order and undefined", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: undefined } })).toBe('{"a":{"d":2},"b":1}');
  });

  it("job keys ignore presigned URLs but not prompts", async () => {
    const base = { projectId: "p", sceneId: "s", kind: "image_keyframe", revision: 1 };
    const k1 = await jobIdempotencyKey({ ...base, input: { prompt: "a", image_urls: ["https://x?sig=1"] } });
    const k2 = await jobIdempotencyKey({ ...base, input: { image_urls: ["https://x?sig=2"], prompt: "a" } });
    const k3 = await jobIdempotencyKey({ ...base, input: { prompt: "b", image_urls: [] } });
    const k4 = await jobIdempotencyKey({ ...base, revision: 2, input: { prompt: "a" } });
    expect(k1).toBe(k2);
    expect(k1).not.toBe(k3);
    expect(k1).not.toBe(k4);
  });

  it("seeds are stable, in range, and change with revision", async () => {
    const a = await deriveSeed(42, 3, 1);
    expect(a).toBe(await deriveSeed(42, 3, 1));
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(2 ** 31);
    expect(await deriveSeed(42, 3, 2)).not.toBe(a);
  });
});

describe("timing", () => {
  const words: AlignedWord[] = Array.from({ length: 10 }, (_, i) => ({
    text: `w${i}`,
    startMs: i * 400,
    endMs: i * 400 + 300,
  }));

  it("targets ~2.5 words/s", () => {
    expect(targetWordCount(30)).toBe(75);
    expect(targetWordCount(600)).toBe(1500);
  });

  it("derives contiguous scene times from word spans", () => {
    const t = timeScenes(words, [
      { wordStart: 0, wordEnd: 4 },
      { wordStart: 5, wordEnd: 9 },
    ]);
    expect(t[0]).toMatchObject({ startMs: 0, endMs: 2000 - 120 });
    expect(t[1]).toMatchObject({ startMs: 1880, endMs: 9 * 400 + 300 + 600 });
  });

  it("rejects gaps and overlaps", () => {
    expect(() => timeScenes(words, [{ wordStart: 0, wordEnd: 3 }, { wordStart: 5, wordEnd: 9 }])).toThrow(/contiguous/);
    expect(() => timeScenes(words, [{ wordStart: 0, wordEnd: 8 }])).toThrow(/final word/);
  });

  it("requests model durations within each model's rules", () => {
    expect(requestDurationS(3200, { min: 5, max: 15 })).toBe(5); // H3 minimum
    expect(requestDurationS(6100, { min: 5, max: 15 })).toBe(7);
    expect(requestDurationS(6100, { min: 6, max: 20, allowed: [6, 8, 10] })).toBe(8); // LTX discrete
    expect(requestDurationS(25_000, { min: 3, max: 10 })).toBe(10); // Omni cap
  });

  it("fits clips by trim, gentle slow-down, or hold", () => {
    expect(fitClip(7000, 6000).mode).toBe("trim");
    expect(fitClip(5000, 5900).mode).toBe("slow");
    expect(fitClip(5000, 6500).mode).toBe("hold");
  });
});
