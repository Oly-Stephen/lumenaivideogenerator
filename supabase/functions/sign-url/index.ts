// Issues short-lived presigned R2 URLs after an ownership check.
//   POST { "asset_id": "<uuid>" }                                         -> GET url for playback/download
//   POST { "project_id": "<uuid>", "upload": { "content_type": "image/png", "ext": "png" } } -> PUT url + new asset id
import { createClient } from "@supabase/supabase-js";
import { presign, r2ConfigFromEnv } from "../_shared/r2.ts";

const UPLOAD_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "audio/wav": "wav",
  "audio/mpeg": "mp3",
  "video/mp4": "mp4",
  "application/pdf": "pdf",
};

const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const r2 = r2ConfigFromEnv((k) => Deno.env.get(k) ?? (k === "R2_BUCKET" ? "lumen-media" : undefined));
const viewTtl = Number(Deno.env.get("R2_PRESIGN_TTL_VIEW_S") ?? 900);
// browser callers: only our app origins (comma-separated env; localhost for development)
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "http://localhost:3000").split(",").map((o) => o.trim());

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  if (!allowedOrigins.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

Deno.serve(async (req) => {
  const h = cors(req);
  if (req.method === "OPTIONS") return new Response(null, { status: Object.keys(h).length ? 204 : 403, headers: h });
  const res = await handle(req);
  Object.entries(h).forEach(([k, v]) => res.headers.set(k, v));
  return res;
});

async function handle(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const auth = req.headers.get("Authorization");
  if (!auth) return new Response("unauthorized", { status: 401 });

  // user-scoped client: RLS decides what this caller may see
  const user = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: who } = await user.auth.getUser();
  if (!who.user) return new Response("unauthorized", { status: 401 });

  const body = await req.json().catch(() => null) as
    | { asset_id?: string; project_id?: string; upload?: { content_type?: string } }
    | null;
  if (!body) return new Response("bad json", { status: 400 });

  if (body.asset_id) {
    const { data: asset } = await user.from("assets").select("id, r2_key").eq("id", body.asset_id).maybeSingle();
    if (!asset) return new Response("not found", { status: 404 });
    return Response.json({ url: await presign(r2, asset.r2_key, "GET", viewTtl), expires_in: viewTtl });
  }

  if (body.project_id && body.upload?.content_type) {
    const ext = UPLOAD_TYPES[body.upload.content_type];
    if (!ext) return new Response("unsupported content type", { status: 415 });
    const { data: project } = await user.from("projects").select("id").eq("id", body.project_id).maybeSingle();
    if (!project) return new Response("not found", { status: 404 });

    const assetId = crypto.randomUUID();
    const key = `u/${who.user.id}/p/${project.id}/uploads/${assetId}.${ext}`;
    const kind = body.upload.content_type.split("/")[0] === "application" ? "archive" : body.upload.content_type.split("/")[0];
    const { error } = await service.from("assets").insert({
      id: assetId,
      user_id: who.user.id,
      project_id: project.id,
      kind,
      r2_key: key,
      content_type: body.upload.content_type,
      source: "upload",
      meta: { pending_upload: true },
    });
    if (error) return new Response("could not register upload", { status: 500 });
    return Response.json({
      asset_id: assetId,
      url: await presign(r2, key, "PUT", 600, body.upload.content_type),
      headers: { "content-type": body.upload.content_type },
      expires_in: 600,
    });
  }

  return new Response("expected asset_id or project_id+upload", { status: 400 });
}
