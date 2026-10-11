import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import pg from "pg";
import { loadConfig } from "./config.ts";
import { advance, type Ctx } from "./pipeline/orchestrator.ts";
import { FalClient } from "./providers/fal.ts";
import { createLlmProvider } from "./providers/llm.ts";
import { ack, archive, extendLease, HEARTBEAT_MS, MAX_READS, readMessages, WORKER_QUEUES, type QueueMessage, type WorkerQueue } from "./queue.ts";
import { Storage } from "./storage.ts";

type Handler = (msg: QueueMessage, db: pg.Pool) => Promise<void>;

const cfg = loadConfig();
await mkdir(cfg.tmpDir, { recursive: true });
const db = new pg.Pool({ connectionString: cfg.databaseUrl, max: 6, idleTimeoutMillis: 30_000, keepAlive: true });
// The pooler can reset idle connections (ECONNRESET). Without a listener, pg's 'error' event crashes the process;
// with one, the dead client is discarded and the next query opens a fresh connection.
db.on("error", (err) => console.warn("[db] idle connection error (discarded):", err.message));
process.on("unhandledRejection", (err) => console.error("[worker] unhandled rejection:", err));
const storage = new Storage(cfg.r2);
const ctx: Ctx = { cfg, db, storage, fal: new FalClient(cfg, db, storage), llm: createLlmProvider(cfg.fixturesDir, cfg.mode) };

// M1: the orchestrator drives each project; llm/ingest/render queues are reserved for the M2+ split.
const handlers: Record<WorkerQueue, Handler> = {
  orchestrate: async (m) => {
    const id = (m.message as { project_id?: string }).project_id;
    if (id) await advance(ctx, id);
  },
  llm: async (m) => console.log("[llm] received", m.msg_id, m.message),
  ingest: async (m) => console.log("[ingest] received", m.msg_id, m.message),
  render: async (m) => console.log("[render] received", m.msg_id, m.message),
};

let stopping = false;
let lastTickAt = Date.now();
const POLL_IDLE_MS = 1000;

async function processQueue(queue: WorkerQueue): Promise<number> {
  const msgs = await readMessages(db, queue, 1);
  for (const m of msgs) {
    if (m.read_ct > MAX_READS) {
      console.error(`[${queue}] giving up on ${m.msg_id} after ${m.read_ct} reads`);
      await archive(db, queue, m.msg_id);
      continue;
    }
    const heartbeat = setInterval(() => {
      extendLease(db, queue, m.msg_id).catch((e) => console.warn(`[${queue}] lease extend failed`, e.message));
    }, HEARTBEAT_MS);
    try {
      await handlers[queue](m, db);
      await ack(db, queue, m.msg_id);
    } catch (err) {
      // leave the message: it becomes visible again after its visibility timeout
      console.error(`[${queue}] handler failed for ${m.msg_id}`, err);
    } finally {
      clearInterval(heartbeat);
    }
  }
  return msgs.length;
}

async function loop(): Promise<void> {
  while (!stopping) {
    lastTickAt = Date.now();
    let worked = 0;
    for (const q of WORKER_QUEUES) {
      try {
        worked += await processQueue(q);
      } catch (err) {
        console.error(`[${q}] poll failed`, err);
      }
    }
    if (worked === 0) await new Promise((r) => setTimeout(r, POLL_IDLE_MS));
  }
}

const health = createServer((req, res) => {
  if (req.url === "/healthz") {
    const stale = Date.now() - lastTickAt > 60_000;
    res.writeHead(stale ? 503 : 200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: !stale, lastTickAt }));
    return;
  }
  res.writeHead(404).end();
});
health.listen(Number(process.env.PORT ?? 8080));

async function shutdown(signal: string): Promise<void> {
  console.log(`received ${signal}, draining`);
  stopping = true;
  health.close();
  await db.end();
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

console.log(`worker started (PROVIDER_MODE=${cfg.mode}, LLM=${ctx.llm.name}); queues:`, WORKER_QUEUES.join(", "));
void loop();
