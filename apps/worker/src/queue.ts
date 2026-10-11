import type { Pool } from "pg";

export const WORKER_QUEUES = ["orchestrate", "llm", "ingest", "render"] as const;
export type WorkerQueue = (typeof WORKER_QUEUES)[number];

export interface QueueMessage<T = Record<string, unknown>> {
  msg_id: string; // bigint as string
  read_ct: number;
  enqueued_at: Date;
  vt: Date;
  message: T;
}

/** Visibility timeouts: how long a message stays hidden while a consumer works on it (retry = it reappears). */
// Short visibility + heartbeat: a live consumer keeps extending its lease (extendLease); a crashed one stops,
// so its message reappears within ~VISIBILITY_S instead of after the whole step's worst-case duration.
export const VISIBILITY_S: Record<WorkerQueue, number> = { orchestrate: 120, llm: 120, ingest: 120, render: 120 };
export const HEARTBEAT_MS = 45_000;
export const MAX_READS = 5;

export async function readMessages(db: Pool, queue: WorkerQueue, n: number): Promise<QueueMessage[]> {
  const { rows } = await db.query<QueueMessage>(
    "select msg_id::text as msg_id, read_ct, enqueued_at, vt, message from pgmq.read($1::text, $2::int, $3::int)",
    [queue, VISIBILITY_S[queue], n],
  );
  return rows;
}

export async function extendLease(db: Pool, queue: WorkerQueue, msgId: string): Promise<void> {
  await db.query("select pgmq.set_vt($1::text, $2::bigint, $3::int)", [queue, msgId, VISIBILITY_S[queue]]);
}

export async function ack(db: Pool, queue: WorkerQueue, msgId: string): Promise<void> {
  await db.query("select pgmq.delete($1::text, $2::bigint)", [queue, msgId]);
}

/** Poison messages are archived (kept for inspection) instead of retried forever. */
export async function archive(db: Pool, queue: WorkerQueue, msgId: string): Promise<void> {
  await db.query("select pgmq.archive($1::text, $2::bigint)", [queue, msgId]);
}

export async function send(db: Pool, queue: string, message: Record<string, unknown>, delayS = 0): Promise<void> {
  await db.query("select pgmq.send($1::text, $2::jsonb, $3::int)", [queue, JSON.stringify(message), delayS]);
}
