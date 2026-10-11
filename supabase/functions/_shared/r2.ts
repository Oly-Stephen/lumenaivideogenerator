// Presigned R2 URLs (S3 SigV4 query signing). Works in Deno Edge and Node.
import { AwsClient } from "aws4fetch";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export type PresignMethod = "GET" | "PUT";

const MAX_TTL_S = 7 * 24 * 3600; // SigV4 hard limit

export function r2ConfigFromEnv(get: (k: string) => string | undefined): R2Config {
  const need = (k: string) => {
    const v = get(k);
    if (!v) throw new Error(`missing env ${k}`);
    return v;
  };
  // accept the bare 32-hex id or the full S3 endpoint URL copied from the dashboard
  const accountId = need("R2_ACCOUNT_ID").match(/[0-9a-f]{32}/)?.[0];
  if (!accountId) throw new Error("R2_ACCOUNT_ID must contain a 32-character account id");
  return {
    accountId,
    accessKeyId: need("R2_ACCESS_KEY_ID"),
    secretAccessKey: need("R2_SECRET_ACCESS_KEY"),
    bucket: need("R2_BUCKET"),
  };
}

/** Keys are always app-generated (docs/03 §2.1); reject anything that could escape the layout. */
export function assertSafeKey(key: string): void {
  if (!/^u\/[0-9a-f-]{36}\/[A-Za-z0-9_./-]+$/.test(key) || key.includes("..") || key.includes("//")) {
    throw new Error(`unsafe r2 key: ${key}`);
  }
}

export function objectUrl(cfg: R2Config, key: string): string {
  const path = key.split("/").map(encodeURIComponent).join("/");
  return `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}/${path}`;
}

export async function presign(
  cfg: R2Config,
  key: string,
  method: PresignMethod,
  ttlSeconds: number,
  contentType?: string,
): Promise<string> {
  assertSafeKey(key);
  const ttl = Math.max(1, Math.min(Math.floor(ttlSeconds), MAX_TTL_S));
  const client = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const url = new URL(objectUrl(cfg, key));
  url.searchParams.set("X-Amz-Expires", String(ttl));
  const headers: Record<string, string> = {};
  if (method === "PUT" && contentType) headers["content-type"] = contentType;
  // allHeaders: for PUT, bind Content-Type into the signature so the uploader can't change the file type
  const signed = await client.sign(new Request(url, { method, headers }), {
    aws: { signQuery: true, allHeaders: method === "PUT" && !!contentType },
  });
  return signed.url;
}
