import pg from "pg";

export type Db = pg.Pool;

export function createDb(url: string): Db {
  return new pg.Pool({ connectionString: url, max: 6 });
}

export interface ProjectRow {
  id: string;
  user_id: string;
  title: string | null;
  input_mode: "topic" | "script";
  input_text: string;
  format: "short_9x16" | "full_16x9";
  target_duration_s: number;
  quality: "budget" | "standard" | "premium";
  language: string;
  style_preset: string;
  style_bible_id: string | null;
  voice_id: string;
  subtitles: boolean;
  music: boolean;
  autopilot: boolean;
  status: string;
  project_seed: string; // bigint
  current_script_id: string | null;
}

export async function getProject(db: Db, id: string): Promise<ProjectRow | null> {
  const { rows } = await db.query<ProjectRow>("select * from public.projects where id = $1", [id]);
  return rows[0] ?? null;
}

export async function setStatus(db: Db, id: string, status: string, detail: string | null, progress?: number): Promise<void> {
  await db.query(
    "update public.projects set status = $2::public.project_status, status_detail = $3, progress = coalesce($4, progress) where id = $1",
    [id, status, detail, progress ?? null],
  );
}

export async function setDetail(db: Db, id: string, detail: string, progress?: number): Promise<void> {
  await db.query("update public.projects set status_detail = $2, progress = coalesce($3, progress) where id = $1", [id, detail, progress ?? null]);
}

/** Records the step that failed so the owner can resume from it (rpc_retry_project). */
export async function failProject(db: Db, id: string, err: unknown, step: string): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  await db.query(
    "update public.projects set status = 'failed', status_detail = $2, error = $3 where id = $1",
    [id, message.slice(0, 300), JSON.stringify({ message, step, at: new Date().toISOString() })],
  );
}

export interface AssetInput {
  userId: string;
  projectId: string | null;
  kind: "image" | "video" | "audio" | "subtitle" | "json" | "archive";
  key: string;
  contentType: string;
  bytes?: number;
  width?: number;
  height?: number;
  durationMs?: number;
  source: string;
  sourceRequestId?: string | null;
  meta?: Record<string, unknown>;
}

/** Idempotent on r2_key: re-registering the same object returns the existing id. */
export async function upsertAsset(db: Db, a: AssetInput): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.assets (user_id, project_id, kind, r2_key, content_type, bytes, width, height, duration_ms, source, source_request_id, meta)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     on conflict (r2_key) do update set bytes = excluded.bytes, width = excluded.width, height = excluded.height,
       duration_ms = excluded.duration_ms, meta = excluded.meta
     returning id`,
    [a.userId, a.projectId, a.kind, a.key, a.contentType, a.bytes ?? null, a.width ?? null, a.height ?? null, a.durationMs ?? null,
      a.source, a.sourceRequestId ?? null, JSON.stringify(a.meta ?? {})],
  );
  return rows[0]!.id;
}

export async function assetKey(db: Db, assetId: string): Promise<string> {
  const { rows } = await db.query<{ r2_key: string }>("select r2_key from public.assets where id = $1", [assetId]);
  if (!rows[0]) throw new Error(`asset ${assetId} not found`);
  return rows[0].r2_key;
}
