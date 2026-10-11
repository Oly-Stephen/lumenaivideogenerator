// fal queue client with: idempotent job rows, hard budget guard (D009), live / replay / mock modes.
// Replay: every live result is recorded under fixtures/fal/<hash>.json together with the R2 keys it was copied to,
// so re-running the same request later costs $0 (the object is copied from the recorded key).
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson, jobIdempotencyKey } from "@lumen/core";
import type { Config } from "../config.ts";
import type { Db } from "../db.ts";
import type { Storage } from "../storage.ts";
import { fetchRetry } from "../net.ts";

export class BudgetExceededError extends Error {}
export class ReplayMissError extends Error {}

export interface FalCall {
  projectId: string;
  sceneId?: string | null;
  revision?: number;
  kind: string; // public.job_kind
  endpoint: string;
  input: Record<string, unknown>; // may contain presigned URLs
  stableRefs: string[]; // R2 keys the URLs point at — hashed instead of the URLs
  estUsd: number;
  priority?: number;
}

export interface FalOutputFile {
  url: string;
  content_type?: string;
}

const FAL_QUEUE = "https://queue.fal.run";

function fixtureHash(endpoint: string, input: Record<string, unknown>, refs: string[]): string {
  const stripped = JSON.parse(JSON.stringify(input), (k, v) => (/(^|_)urls?$/.test(k) ? undefined : v));
  return createHash("sha256").update(endpoint + "|" + canonicalJson(stripped) + "|" + refs.join(",")).digest("hex").slice(0, 32);
}

class Semaphore {
  private queue: (() => void)[] = [];
  constructor(private n: number) {}
  async acquire(): Promise<() => void> {
    if (this.n > 0) { this.n--; return () => this.release(); }
    await new Promise<void>((r) => this.queue.push(r));
    this.n--;
    return () => this.release();
  }
  private release() { this.n++; this.queue.shift()?.(); }
}

export class FalClient {
  private sem: Semaphore;
  constructor(private cfg: Config, private db: Db, private storage: Storage) {
    this.sem = new Semaphore(cfg.falMaxInflight);
  }

  private headers() {
    return { Authorization: `Key ${this.cfg.falKey}`, "Content-Type": "application/json" };
  }

  /** Throws BudgetExceededError if this call could push total or daily fal spend past the caps. */
  async assertBudget(estUsd: number): Promise<void> {
    const { rows } = await this.db.query<{ total: string; today: string }>(
      // money actually spent (reconciled) or committed (submitted/in flight); queued-but-unsent jobs are not spend
      `select public.fal_spend_usd() as total,
              coalesce(sum(coalesce(cost_usd, case when status in ('submitting','submitted','in_progress') then est_cost_usd else 0 end))
                filter (where created_at >= date_trunc('day', now())), 0) as today
         from public.jobs where provider = 'fal'`,
    );
    const total = Number(rows[0]?.total ?? 0);
    const today = Number(rows[0]?.today ?? 0);
    if (total + estUsd > this.cfg.falTotalBudgetUsd) {
      throw new BudgetExceededError(`fal budget cap: spent $${total.toFixed(3)} + $${estUsd.toFixed(3)} > $${this.cfg.falTotalBudgetUsd}`);
    }
    if (today + estUsd > this.cfg.dailyBudgetUsd) {
      throw new BudgetExceededError(`fal daily cap: today $${today.toFixed(3)} + $${estUsd.toFixed(3)} > $${this.cfg.dailyBudgetUsd}`);
    }
  }

  /**
   * Runs one fal request to completion and copies its output files into R2 at the given keys.
   * Re-entrant: a succeeded job with the same idempotency key is returned without a new call.
   */
  async run(call: FalCall, outputs: { pick: (out: any) => FalOutputFile[]; keys: string[] }): Promise<{ jobId: string; raw: any; keys: string[] }> {
    const idem = await jobIdempotencyKey({ projectId: call.projectId, sceneId: call.sceneId, kind: call.kind, revision: call.revision, input: { ...call.input, refs: call.stableRefs } });
    const hash = fixtureHash(call.endpoint, call.input, call.stableRefs);
    const fixturePath = join(this.cfg.fixturesDir, "fal", `${hash}.json`);

    const existing = await this.db.query<{ id: string; status: string; output: any; fal_request_id: string | null }>(
      "select id, status, output, fal_request_id from public.jobs where idempotency_key = $1", [idem]);
    let job = existing.rows[0];
    if (job?.status === "succeeded" && job.output?.r2_keys) return { jobId: job.id, raw: job.output.raw, keys: job.output.r2_keys };
    if (job && ["failed", "canceled", "dead"].includes(job.status)) {
      // retry: forget the dead fal request so a fresh one is submitted
      await this.db.query("update public.jobs set status = 'queued', fal_request_id = null, error = null where id = $1", [job.id]);
      job = { ...job, status: "queued", fal_request_id: null };
    }

    if (!job) {
      const ins = await this.db.query<{ id: string; status: string; output: any; fal_request_id: string | null }>(
        `insert into public.jobs (project_id, scene_id, kind, provider, endpoint, idempotency_key, input, est_cost_usd, priority)
         values ($1,$2,$3,'fal',$4,$5,$6,$7,$8)
         on conflict (idempotency_key) do update set attempts = public.jobs.attempts
         returning id, status, output, fal_request_id`,
        [call.projectId, call.sceneId ?? null, call.kind, call.endpoint, idem,
          JSON.stringify({ ...call.input, _refs: call.stableRefs, _fixture: hash }), call.estUsd, call.priority ?? 5]);
      job = ins.rows[0]!;
    }

    // ---- replay / mock: never spend ----
    if (this.cfg.mode !== "live") {
      let fixture: { raw: any; r2_keys: string[] } | null = null;
      try { fixture = JSON.parse(await readFile(fixturePath, "utf8")); } catch { /* none */ }
      if (!fixture) {
        if (this.cfg.mode === "replay") {
          await this.db.query("update public.jobs set status = 'failed', error = $2 where id = $1", [job.id, JSON.stringify({ message: "replay miss" })]);
          throw new ReplayMissError(`replay miss for ${call.endpoint} (${call.kind}); run once with PROVIDER_MODE=live to record it`);
        }
        throw new ReplayMissError("mock mode handles media generation before reaching FalClient");
      }
      for (let i = 0; i < outputs.keys.length; i++) {
        const src = fixture.r2_keys[i];
        if (src && src !== outputs.keys[i]) {
          const buf = await this.storage.get(src);
          await this.storage.put(outputs.keys[i]!, buf, guessType(src));
        }
      }
      await this.db.query("update public.jobs set status = 'succeeded', output = $2, cost_usd = 0, finished_at = now() where id = $1",
        [job.id, JSON.stringify({ raw: fixture.raw, r2_keys: outputs.keys, replayed_from: hash })]);
      return { jobId: job.id, raw: fixture.raw, keys: outputs.keys };
    }

    // ---- live ----
    if (!this.cfg.falKey) throw new Error("FAL_KEY missing");
    const release = await this.sem.acquire();
    try {
      let requestId = job.fal_request_id;
      let statusUrl: string, responseUrl: string;
      if (!requestId) {
        await this.assertBudget(call.estUsd);
        await this.db.query("update public.jobs set status = 'submitting', attempts = attempts + 1 where id = $1", [job.id]);
        const res = await fetchRetry(`${FAL_QUEUE}/${call.endpoint}`, { method: "POST", headers: this.headers(), body: JSON.stringify(call.input) }, { label: `fal submit ${call.endpoint}` });
        if (!res.ok) {
          const text = (await res.text()).slice(0, 500);
          await this.db.query("update public.jobs set status = 'failed', error = $2 where id = $1", [job.id, JSON.stringify({ status: res.status, text })]);
          throw new Error(`fal submit ${call.endpoint} → ${res.status}: ${text}`);
        }
        const sub = (await res.json()) as { request_id: string; status_url: string; response_url: string };
        requestId = sub.request_id; statusUrl = sub.status_url; responseUrl = sub.response_url;
        await this.db.query("update public.jobs set status = 'submitted', fal_request_id = $2, submitted_at = now() where id = $1", [job.id, requestId]);
      } else {
        statusUrl = `${FAL_QUEUE}/${call.endpoint}/requests/${requestId}/status`;
        responseUrl = `${FAL_QUEUE}/${call.endpoint}/requests/${requestId}`;
      }

      let delay = 2000;
      const deadline = Date.now() + 15 * 60_000;
      for (;;) {
        const st = (await (await fetchRetry(statusUrl, { headers: this.headers() }, { retryOnStatus: true, label: "fal status" })).json()) as { status: string; error?: string; error_type?: string };
        if (st.status === "IN_PROGRESS") await this.db.query("update public.jobs set status = 'in_progress', started_at = coalesce(started_at, now()) where id = $1 and status = 'submitted'", [job.id]);
        if (st.status === "COMPLETED") {
          if (st.error) {
            await this.db.query("update public.jobs set status = 'failed', error = $2, finished_at = now() where id = $1", [job.id, JSON.stringify(st)]);
            throw new Error(`fal ${call.endpoint} failed: ${st.error_type ?? ""} ${st.error}`);
          }
          break;
        }
        if (Date.now() > deadline) throw new Error(`fal ${call.endpoint} timed out (request ${requestId})`);
        await new Promise((r) => setTimeout(r, delay + Math.random() * 500));
        delay = Math.min(delay * 1.5, 10_000);
      }

      const resultRes = await fetchRetry(responseUrl, { headers: this.headers() }, { retryOnStatus: true, label: "fal result" });
      const raw = await resultRes.json();
      if (!resultRes.ok) {
        await this.db.query("update public.jobs set status = 'failed', error = $2, finished_at = now() where id = $1", [job.id, JSON.stringify({ status: resultRes.status, raw })]);
        throw new Error(`fal result ${call.endpoint} → ${resultRes.status}: ${JSON.stringify(raw).slice(0, 300)}`);
      }
      const files = outputs.pick(raw);
      if (files.length < outputs.keys.length) throw new Error(`fal ${call.endpoint} returned ${files.length} files, expected ${outputs.keys.length}`);
      for (let i = 0; i < outputs.keys.length; i++) await this.storage.ingestUrl(files[i]!.url, outputs.keys[i]!, files[i]!.content_type ?? guessType(outputs.keys[i]!));

      await this.db.query("update public.jobs set status = 'succeeded', output = $2, cost_usd = est_cost_usd, finished_at = now() where id = $1",
        [job.id, JSON.stringify({ raw, r2_keys: outputs.keys })]);
      await mkdir(join(this.cfg.fixturesDir, "fal"), { recursive: true });
      await writeFile(fixturePath, JSON.stringify({ endpoint: call.endpoint, kind: call.kind, request_id: requestId, raw, r2_keys: outputs.keys, recorded_at: new Date().toISOString() }, null, 2));
      return { jobId: job.id, raw, keys: outputs.keys };
    } finally {
      release();
    }
  }
}

export function guessType(key: string): string {
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg";
  if (key.endsWith(".webp")) return "image/webp";
  if (key.endsWith(".mp4")) return "video/mp4";
  if (key.endsWith(".mp3")) return "audio/mpeg";
  if (key.endsWith(".wav")) return "audio/wav";
  if (key.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}
