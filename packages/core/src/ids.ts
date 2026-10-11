// Deterministic keys & seeds (docs/03 §3.3, §4).

/** JSON with sorted keys, so semantically equal inputs hash identically. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** URLs are presigned and change per call, so they must not influence the key. */
function stripUrls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUrls);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !/(^|_)urls?$/.test(k))
        .map(([k, v]) => [k, stripUrls(v)]),
    );
  }
  return value;
}

export interface JobKeyParts {
  projectId: string;
  sceneId?: string | null;
  kind: string;
  revision?: number;
  input: unknown;
}

export async function jobIdempotencyKey(p: JobKeyParts): Promise<string> {
  return sha256Hex(
    [p.projectId, p.sceneId ?? "-", p.kind, String(p.revision ?? 1), canonicalJson(stripUrls(p.input))].join("|"),
  );
}

/** Seed in [0, 2^31) derived from project seed + scene index + revision (stable across retries). */
export async function deriveSeed(projectSeed: number, sceneIdx: number, revision: number): Promise<number> {
  const hex = await sha256Hex(`${projectSeed}:${sceneIdx}:${revision}`);
  return parseInt(hex.slice(0, 8), 16) & 0x7fffffff;
}
