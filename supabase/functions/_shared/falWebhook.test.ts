import { beforeEach, describe, expect, it } from "vitest";
import {
  _resetJwksCacheForTests,
  getFalJwks,
  hexEncode,
  readWebhookHeaders,
  signedMessage,
  verifyFalWebhook,
  type Jwk,
  type WebhookHeaders,
} from "./falWebhook.ts";

function b64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function makeSigner() {
  const kp = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
  const jwk: Jwk = { kty: "OKP", crv: "Ed25519", x: b64url(raw) };
  const sign = async (h: Omit<WebhookHeaders, "signature">, body: Uint8Array<ArrayBuffer>) => {
    const msg = await signedMessage({ ...h, signature: "" }, body);
    return hexEncode(new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, kp.privateKey, msg)));
  };
  return { jwk, sign };
}

const body = new TextEncoder().encode(JSON.stringify({ request_id: "r1", status: "OK", payload: { ok: 1 } }));
const now = 1_791_700_000;

describe("verifyFalWebhook", () => {
  it("accepts a correctly signed delivery", async () => {
    const s = await makeSigner();
    const base = { requestId: "r1", userId: "u1", timestamp: String(now) };
    const signature = await s.sign(base, body);
    expect(await verifyFalWebhook({ ...base, signature }, body, [s.jwk], now)).toEqual({ ok: true });
  });

  it("accepts when any of several keys verifies (key rotation)", async () => {
    const old = await makeSigner();
    const cur = await makeSigner();
    const base = { requestId: "r1", userId: "u1", timestamp: String(now) };
    const signature = await cur.sign(base, body);
    expect((await verifyFalWebhook({ ...base, signature }, body, [old.jwk, cur.jwk], now)).ok).toBe(true);
  });

  it("rejects a tampered body", async () => {
    const s = await makeSigner();
    const base = { requestId: "r1", userId: "u1", timestamp: String(now) };
    const signature = await s.sign(base, body);
    const tampered = new TextEncoder().encode('{"request_id":"r1","status":"OK","payload":{"ok":2}}');
    expect(await verifyFalWebhook({ ...base, signature }, tampered, [s.jwk], now)).toEqual({
      ok: false,
      reason: "no_key_verified",
    });
  });

  it("rejects replays outside the 300s window", async () => {
    const s = await makeSigner();
    const base = { requestId: "r1", userId: "u1", timestamp: String(now - 301) };
    const signature = await s.sign(base, body);
    expect(await verifyFalWebhook({ ...base, signature }, body, [s.jwk], now)).toEqual({
      ok: false,
      reason: "timestamp_out_of_window",
    });
  });

  it("rejects non-hex signatures", async () => {
    const s = await makeSigner();
    const r = await verifyFalWebhook({ requestId: "r1", userId: "u1", timestamp: String(now), signature: "zz" }, body, [s.jwk], now);
    expect(r).toEqual({ ok: false, reason: "bad_signature_encoding" });
  });
});

describe("readWebhookHeaders", () => {
  it("returns null when any header is missing", () => {
    expect(readWebhookHeaders(new Headers({ "x-fal-webhook-request-id": "r" }))).toBeNull();
  });
});

describe("getFalJwks", () => {
  beforeEach(() => _resetJwksCacheForTests());

  it("caches keys between calls", async () => {
    let calls = 0;
    const fake = (async () => {
      calls++;
      return new Response(JSON.stringify({ keys: [{ x: "abc" }, { nope: 1 }] }));
    }) as unknown as typeof fetch;
    expect(await getFalJwks(fake, 0)).toEqual([{ x: "abc" }]);
    await getFalJwks(fake, 1000);
    expect(calls).toBe(1);
  });
});
