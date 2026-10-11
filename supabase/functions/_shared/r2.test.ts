import { describe, expect, it } from "vitest";
import { assertSafeKey, presign, r2ConfigFromEnv, type R2Config } from "./r2.ts";

const cfg: R2Config = { accountId: "acct123", accessKeyId: "AKIDTEST", secretAccessKey: "secret", bucket: "lumen-media" };
const key = "u/00000000-0000-0000-0000-00000000000a/p/10000000-0000-0000-0000-00000000000a/scenes/000/r1/keyframe_9x16.png";

describe("presign", () => {
  it("produces a SigV4 query-signed GET url with the requested expiry", async () => {
    const url = new URL(await presign(cfg, key, "GET", 900));
    expect(url.host).toBe("acct123.r2.cloudflarestorage.com");
    expect(url.pathname).toBe(`/lumen-media/${key}`);
    expect(url.searchParams.get("X-Amz-Expires")).toBe("900");
    expect(url.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("clamps ttl to the SigV4 maximum", async () => {
    const url = new URL(await presign(cfg, key, "GET", 10 * 24 * 3600));
    expect(url.searchParams.get("X-Amz-Expires")).toBe(String(7 * 24 * 3600));
  });

  it("signs content-type for PUT uploads", async () => {
    const url = new URL(await presign(cfg, key, "PUT", 600, "image/png"));
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain("content-type");
  });
});

describe("r2ConfigFromEnv", () => {
  const env = (id: string) => (k: string) =>
    ({ R2_ACCOUNT_ID: id, R2_ACCESS_KEY_ID: "a", R2_SECRET_ACCESS_KEY: "s", R2_BUCKET: "b" })[k];
  const hex = "0123456789abcdef0123456789abcdef";

  it("accepts a bare account id or the full endpoint url", () => {
    expect(r2ConfigFromEnv(env(hex)).accountId).toBe(hex);
    expect(r2ConfigFromEnv(env(`https://${hex}.r2.cloudflarestorage.com`)).accountId).toBe(hex);
  });

  it("rejects values without an account id", () => {
    expect(() => r2ConfigFromEnv(env("not-an-id"))).toThrow(/32-character/);
  });
});

describe("assertSafeKey", () => {
  it.each([
    "../etc/passwd",
    "u/not-a-uuid/x.png",
    "u/00000000-0000-0000-0000-00000000000a/../other/x.png",
    "u/00000000-0000-0000-0000-00000000000a//x.png",
    "/u/00000000-0000-0000-0000-00000000000a/x.png",
  ])("rejects %s", (k) => {
    expect(() => assertSafeKey(k)).toThrow();
  });

  it("accepts app layout keys", () => {
    expect(() => assertSafeKey(key)).not.toThrow();
  });
});
