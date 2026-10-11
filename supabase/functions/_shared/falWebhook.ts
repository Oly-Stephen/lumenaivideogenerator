// Verifies fal.ai webhook signatures (ED25519, JWKS) — runtime-agnostic (Deno Edge + Node via WebCrypto).
// Spec: https://fal.ai/docs/documentation/model-apis/inference/webhooks.md#verifying-your-webhook

export const FAL_JWKS_URL = "https://rest.fal.ai/.well-known/jwks.json";
const MAX_SKEW_S = 300;
const JWKS_TTL_MS = 12 * 60 * 60 * 1000; // fal: cache, but never longer than 24h

export interface Jwk {
  kty?: string;
  crv?: string;
  x: string;
}

export interface WebhookHeaders {
  requestId: string;
  userId: string;
  timestamp: string;
  signature: string;
}

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export function readWebhookHeaders(h: Headers): WebhookHeaders | null {
  const requestId = h.get("x-fal-webhook-request-id");
  const userId = h.get("x-fal-webhook-user-id");
  const timestamp = h.get("x-fal-webhook-timestamp");
  const signature = h.get("x-fal-webhook-signature");
  if (!requestId || !userId || !timestamp || !signature) return null;
  return { requestId, userId, timestamp, signature };
}

export function base64UrlDecode(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function hexDecode(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function hexEncode(bytes: Uint8Array<ArrayBuffer>): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signedMessage(h: WebhookHeaders, rawBody: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", rawBody));
  const msg = [h.requestId, h.userId, h.timestamp, hexEncode(digest)].join("\n");
  return new TextEncoder().encode(msg);
}

export async function verifyFalWebhook(
  h: WebhookHeaders,
  rawBody: Uint8Array<ArrayBuffer>,
  keys: Jwk[],
  nowS: number = Math.floor(Date.now() / 1000),
): Promise<VerifyResult> {
  const ts = Number(h.timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: "bad_timestamp" };
  if (Math.abs(nowS - ts) > MAX_SKEW_S) return { ok: false, reason: "timestamp_out_of_window" };

  const sig = hexDecode(h.signature);
  if (!sig) return { ok: false, reason: "bad_signature_encoding" };

  const message = await signedMessage(h, rawBody);
  for (const k of keys) {
    try {
      const key = await crypto.subtle.importKey("raw", base64UrlDecode(k.x), { name: "Ed25519" }, false, ["verify"]);
      if (await crypto.subtle.verify({ name: "Ed25519" }, key, sig, message)) return { ok: true };
    } catch {
      // malformed key — try the next one
    }
  }
  return { ok: false, reason: "no_key_verified" };
}

let jwksCache: { keys: Jwk[]; fetchedAt: number } | null = null;

export async function getFalJwks(fetchImpl: typeof fetch = fetch, now = Date.now()): Promise<Jwk[]> {
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_TTL_MS) return jwksCache.keys;
  const res = await fetchImpl(FAL_JWKS_URL);
  if (!res.ok) throw new Error(`fal JWKS fetch failed: ${res.status}`);
  const body = (await res.json()) as { keys?: Jwk[] };
  const keys = (body.keys ?? []).filter((k) => typeof k.x === "string");
  jwksCache = { keys, fetchedAt: now };
  return keys;
}

export function _resetJwksCacheForTests(): void {
  jwksCache = null;
}

/** Shape of fal's webhook POST body. */
export interface FalWebhookBody {
  request_id: string;
  gateway_request_id?: string;
  status: "OK" | "ERROR";
  payload: unknown;
  error?: string;
  payload_error?: string;
}
