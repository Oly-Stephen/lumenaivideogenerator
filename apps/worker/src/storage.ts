// R2 access for the worker. All objects are private; URLs handed to providers are short-lived presigned GETs.
import { readFile } from "node:fs/promises";
import { presign, type R2Config } from "../../../supabase/functions/_shared/r2.ts";
import { fetchRetry } from "./net.ts";

export class Storage {
  constructor(private cfg: R2Config) {}

  async put(key: string, body: Uint8Array | Buffer, contentType: string): Promise<number> {
    const url = await presign(this.cfg, key, "PUT", 600, contentType);
    const res = await fetchRetry(url, { method: "PUT", headers: { "content-type": contentType }, body: new Uint8Array(body) }, { retryOnStatus: true, label: `R2 PUT ${key}` });
    if (!res.ok) throw new Error(`R2 PUT ${key} failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
    return body.byteLength;
  }

  async putFile(key: string, path: string, contentType: string): Promise<number> {
    return this.put(key, await readFile(path), contentType);
  }

  async get(key: string): Promise<Buffer> {
    const res = await fetchRetry(await this.url(key, 600), {}, { retryOnStatus: true, label: `R2 GET ${key}` });
    if (!res.ok) throw new Error(`R2 GET ${key} failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  url(key: string, ttlS = 3600): Promise<string> {
    return presign(this.cfg, key, "GET", ttlS);
  }

  /** Download a provider output (public URL) straight into R2. */
  async ingestUrl(srcUrl: string, key: string, fallbackType: string): Promise<{ bytes: number; contentType: string }> {
    const res = await fetchRetry(srcUrl, {}, { retryOnStatus: true, label: "download output" });
    if (!res.ok) throw new Error(`download ${srcUrl} failed: ${res.status}`);
    const contentType = res.headers.get("content-type")?.split(";")[0] || fallbackType;
    const buf = Buffer.from(await res.arrayBuffer());
    await this.put(key, buf, contentType);
    return { bytes: buf.byteLength, contentType };
  }
}
