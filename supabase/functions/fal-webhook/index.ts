// fal.ai completion webhook. Must be deployed with verify_jwt = false (fal does not send a Supabase JWT);
// authenticity comes from the ED25519 signature instead.
import { createClient } from "@supabase/supabase-js";
import { getFalJwks, readWebhookHeaders, verifyFalWebhook, type FalWebhookBody } from "../_shared/falWebhook.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const headers = readWebhookHeaders(req.headers);
  if (!headers) return new Response("missing signature headers", { status: 401 });

  const raw = new Uint8Array(await req.arrayBuffer());
  const verdict = await verifyFalWebhook(headers, raw, await getFalJwks());
  if (!verdict.ok) {
    console.warn("fal webhook rejected", verdict.reason, headers.requestId);
    return new Response("invalid signature", { status: 401 });
  }

  let body: FalWebhookBody;
  try {
    body = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return new Response("bad json", { status: 400 }); // 4xx => fal retries; signature was valid so log loudly
  }

  const { data, error } = await supabase.rpc("apply_fal_webhook", {
    p_request_id: body.request_id,
    p_status: body.status,
    p_payload: (body.payload ?? null) as unknown,
    p_error: body.error ?? body.payload_error ?? null,
  });
  if (error) {
    console.error("apply_fal_webhook failed", body.request_id, error.message);
    return new Response("retry later", { status: 500 }); // fal retries with backoff
  }
  return Response.json({ result: data });
});
