# 02 — Stack Research: fal.ai + Supabase (+ Claude for text)

> **Researched:** 2026-10-11, from live docs.
> **Sources:**
> - fal: `fal.ai/llms.txt`, `fal.ai/docs/*.md`, per-model `fal.ai/models/<id>/llms.txt`, the public catalog API `api.fal.ai/v1/models` (1,514 models)
> - Supabase: `supabase.com/docs/*.md`, `supabase.com/pricing.md`
> - Claude: the bundled `claude-api` skill model table (cached 2026-10-06)
>
> Prices are the **list prices as shown on each fal model page today**. fal states "Pricing is subject to change": re-check before launch with `POST /v1/models/pricing/estimate`. Nothing was purchased or called with a key.

---

## 1. fal.ai platform facts that shape the design

### 1.1 Queue API (async, recommended for everything here)
- **Submit:** `POST https://queue.fal.run/<endpoint-id>` with header `Authorization: Key $FAL_KEY` → returns `{request_id, status_url, response_url, cancel_url, queue_position}`.
- **Status:** `GET …/requests/{id}/status?logs=1` returns `IN_QUEUE` (with `queue_position`), then `IN_PROGRESS` (with logs), then `COMPLETED` (with `metrics.inference_time`, plus `error` and `error_type` on failure). An SSE stream is available at `…/status/stream`.
- **Result:** `GET …/requests/{id}`. Output shape is model-specific (`video.url`, `images[]`, `audio.url`).
- **Cancel:** `PUT …/cancel` → `202 CANCELLATION_REQUESTED`, `400 ALREADY_COMPLETED`, or `404`. A request that is already in progress may still finish (and still bill).
- **Guarantees:** The queue is persistent, there is no queue size limit, and requests are never dropped. A runner failure re-queues the request automatically. Disable that with `X-Fal-No-Retry: 1`.
- **Useful headers:**
  - `X-Fal-Request-Start-Timeout` (`start_timeout`): a server-side deadline that applies *before* processing starts.
  - `X-Fal-Queue-Priority: low`, for background batches.
  - `X-Fal-Runner-Hint`, for sticky routing.
  - `X-Fal-Store-IO: 0`, which stops fal storing request payloads.
  - `X-Fal-Object-Lifecycle-Preference: {"expiration_duration_seconds":N, "initial_acl":…}`.

### 1.2 Webhooks
- Pass `?fal_webhook=<url>` (REST) or `webhookUrl` (JS) / `webhook_url` (Python).
- **Payload:** `{request_id, gateway_request_id, status:"OK"|"ERROR", payload, error?, payload_error?}`.
- **Delivery:**
  - The first attempt times out after 15 s; retries time out after 120 s.
  - Retries use backoff, up to **31 times**, until the stored result expires: about 1 h after completion, or about 6 min for results of 10 KB or more.
  - **A 3xx response is a permanent failure.**
  - Private, loopback, and localhost URLs are dropped. Local development therefore needs a tunnel (ngrok is installed on this machine) or polling only.
- **Verification (required):**
  - Algorithm: **ED25519**. Public keys come from JWKS at `https://rest.fal.ai/.well-known/jwks.json`; cache them for at most 24 h.
  - Headers: `X-Fal-Webhook-Request-Id`, `-User-Id`, `-Timestamp`, `-Signature` (hex).
  - Signed message: `request_id \n user_id \n timestamp \n hex(sha256(raw_body))`.
  - Reject timestamps more than ±300 s from now.
- The handler must be **idempotent** (dedupe on `request_id`). Keep polling as a recovery path.

### 1.3 Clients
- **JS/TS:** `@fal-ai/client`.
  - `fal.queue.submit(id, {input, webhookUrl, priority, headers, startTimeout, hint})`
  - `fal.queue.status`, `.streamStatus`, `.result`, `.cancel`
  - `fal.subscribe` (polls for you)
  - `fal.storage.upload(blob)`
  - For browsers there is a server-side proxy so `FAL_KEY` stays secret. We won't call fal from the browser at all.
- **Python:** `fal-client`: `submit` / `submit_async` → handle `.status()`, `.get()`, `.cancel()`, `.iter_events()`; `upload_file` / `upload`.
- **SDK retries:** they retry 429s up to 10 times. The queue retries concurrency waits with no limit.

### 1.4 Files and storage
- **Inputs are URLs.** Presigned URLs from S3/GCS/R2-style storage work, so **Supabase Storage signed URLs can be passed straight to fal**. URLs that require an auth header do not work. Data URIs work but aren't recommended above a few KB.
- **Uploading to fal's CDN:**
  - URLs look like `https://v3b.fal.media/files/b/...`.
  - Multipart upload is automatic (JS threshold 90 MB).
  - Uploads are retried 10 times, with endpoint fallbacks.
- **Output media:**
  - Public URLs by default; ACLs and signed URLs are available through the Platform API.
  - Kept for **at least 7 days by default**, and the lifetime is configurable per request.
  - **We copy every output into Supabase Storage immediately** and set a short fal expiration.
- Request payload history is kept 30 days unless `X-Fal-Store-IO: 0` is set.

### 1.5 Concurrency and rate limits
- The **global account concurrency** counts only requests `IN_PROGRESS`. Queued requests don't count.
- **New accounts get 2.** The limit auto-scales with paid invoices over the last 4 weeks, **up to 40 self-serve**; Enterprise goes higher.
- Some hot models also have per-endpoint caps.
- Hitting the limit with direct (non-queue) calls returns `429` with `concurrent_requests_limit` and `X-Fal-needs-retry: 1`. With the queue, the request just waits.
- **Implication:** with concurrency 2, roughly 100 video clips take more than an hour. We need our own **per-project and global semaphores** so one user can't starve the others, plus priority (`low` for shorts and batch work).

### 1.6 Billing
- Per output, priced per model, drawn from prepaid credits.
- **Not charged:** server errors (5xx) and queue wait time.
- **May be charged:** 422 errors after GPU time has been spent, and `content_policy_violation` (422, non-retryable).
- Credits expire after 365 days. The account **locks below a balance threshold**, so we need balance monitoring.
- Programmatic access: `GET /v1/models/pricing`, `POST /v1/models/pricing/estimate`, `GET /v1/models/usage` (per-request cost reconciliation).

---

## 2. Model selection (first choice and fallback per step)

`$/s` means per second of output video. ★ marks the recommended default.

| Step | First choice (exact ID) | Price / limits | Fallback (exact ID) | Price / limits | Why |
|---|---|---|---|---|---|
| **Research, script, scene plan (LLM)** | ★ **Claude API direct: `claude-opus-5-5`**, with web search `web_search_20260209` and structured outputs | $4 in / $20 out per MTok; 1M context; 128K output; prompt caching (reads $0.20/MTok). Thinking is always adaptive; effort defaults to `medium`. | `openrouter/router` on fal, model `anthropic/claude-opus-5.5` (or `google/gemini-3.8-flash` for cheap drafts) | token pass-through, billed via fal | fal has **no first-party strong LLM**. Its LLM category is the OpenRouter router plus small models. Going direct gives structured outputs, caching, web search with citations, and the server-side refusal fallback. The router keeps billing on one invoice. |
| (premium option) | `claude-fable-5-1` (Higgsfield uses Fable 5, per Phase 1) | $10 / $50 per MTok | — | — | Use only if script quality on Opus 5.5 falls short in evals. About 2.5× the cost. |
| **Character sheet, style frames, keyframes (image with refs)** | ★ **`google/nano-banana-2.1/edit`** (+ `google/nano-banana-2.1` for text-to-image) | About **$0.044 (1K) / $0.063 (2K) / $0.138 (4K)** per image with 2 refs. **Up to 14 reference images**. `seed`. Aspect ratios include 16:9 and 9:16. `system_prompt` is available for a locked style bible. | `bytedance/seedream/v5/lite/edit` | **$0.035/image**, up to 10 refs | Best reference fidelity per dollar. A system prompt lets us pin the style bible on every call. |
| **Scene motion: premium tier (reference-to-video)** | ★ **`google/gemini-omni-flash/v1.1/reference-to-video`** | **$0.03 (360p) / $0.10 (720p) / $0.15 (1080p) / $0.30 (4K) per s.** 3–10 s, integer. 16:9 or 9:16. `image_urls[]` refs addressed as `<IMAGE_REF_n>` in the prompt; up to 3 reference videos of ≤ 3 s. **No seed parameter.** | `bytedance/seedance-2.0/mini/reference-to-video` | ~$0.072 (480p) / $0.155 (720p) per s, 4–15 s | This is the model Higgsfield uses (Phase 1). It takes character refs directly with no keyframe step, which gives the best consistency. |
| **Scene motion: standard tier (image-to-video from our keyframe)** | ★ **`minimax/h3/image-to-video`** at `768P` | **$0.05 (480P) / $0.06 (768P) / $0.13 (2K) / $0.16 (4K) per s.** **5–15 s**. `seed`. | `alibaba/wan-3.0/image-to-video` | **$0.05 (480p) / $0.10 (720p) / $0.20 (1080p) per s.** **2–30 s**. `seed`. Turn `audio` off. | The keyframe (built with refs and a seed) locks identity; image-to-video only adds motion. Cheapest good per-second rate. Wan covers scenes shorter than 5 s. |
| **Scene motion: budget tier** | ★ **No AI video.** The keyframe gets Ken Burns / parallax motion in our render worker. | $0 marginal (the keyframe is already paid for) | `fal-ai/ffmpeg-api/images-to-video` | $0/compute-s, but frame-hold only | Mirrors Higgsfield's own cheaper `scene_based` mode (96 vs 246 credits/min, Phase 1 §6). |
| **TTS narration** | ★ **`fal-ai/minimax/speech-2.8-hd`** | **$0.10 / 1K chars.** Prompt ≤ **10,000 chars** per call. `voice_setting.voice_id` accepts library **or cloned** IDs; also speed, pitch, emotion. `pronunciation_dict`. `<#x#>` pause tags. Returns `duration_ms`. | `elevenlabs/tts/eleven-v4-turbo` | **$0.04 / 1K chars.** `seed`. Returns **`timestamps`**. Library voices only on fal. | One engine for both library and cloned voices keeps the voice consistent. The fallback is cheaper and returns its own timestamps. |
| **Word timing (captions and scene cuts)** | ★ **`fal-ai/elevenlabs/forced-alignment`** | **$0.22 per audio-hour, rounded up**, so $0.22 per video. Returns `words[]` and `characters[]` with times. | `fal-ai/elevenlabs/speech-to-text/scribe-v2` | $0.008/min. Returns `words[]`. | Exact alignment against our own script, so there are no transcription errors. |
| **Voice cloning** | ★ **`fal-ai/minimax/voice-clone`** | **$1.50 per clone** (previews $0.30 / 1K chars). Needs ≥ **10 s** of audio. Returns `custom_voice_id`. **The clone is deleted unless used with TTS within 7 days.** | `fal-ai/qwen-3-tts/clone-voice/1.7b` (+ `fal-ai/qwen-3-tts/text-to-speech/1.7b`) | $0.0008/min. Returns a `speaker_embedding` file. | Plugs straight into speech-2.8-hd. **Requires a consent flow** (Phase 3 risks). |
| **Translate and re-dub** | ★ Claude translates the script → speech-2.8-hd in the same `voice_id` → re-time scenes → re-render | about $1 TTS plus LLM tokens | `fal-ai/elevenlabs/dubbing` | **$0.60/min**, rounded up | Our own pipeline keeps the music bed and captions clean and re-times visuals to the new audio. ElevenLabs dubbing works on the mixed audio. |
| **Music bed** | ★ **`minimax/music-3`** (instrumental prompt) | **$0.002/s**. Duration is an upper bound (default 60 s). `seed`. | `elevenlabs/music/v2.5` | **$0.60 per output minute** (rounded up), 3 s–10 min, `force_instrumental`, composition plan | Generate a 2–3 min bed and loop it with crossfades in the worker. Fallback for higher quality. Budget alternative: `fal-ai/stable-audio-3/medium/text-to-audio`, $0.0376/generation, up to 380 s. |
| **Lip sync** | **Not needed for MVP** (faceless format) | — | `veed/lipsync/v2` ($0.07/s) or `fal-ai/sync-lipsync/v3` ($8/min) | — | Only if we add on-screen talking characters later. |
| **Upscaling (optional)** | ★ Render natively at 720p/768P, then **`topaz/upscale/video/precision`** | **$0.20 per 10 s at 1080p** (Gaia 2 animation model $0.10 per 10 s), so about $6–12 for 10 min | `fal-ai/flashvsr/upscale/video` | $0.0005 per MP-frame, about $15 for 10 min at 1080p/24fps | Only for a 1080p export tier. Omni at 1080p directly (+$0.05/s = +$30 for 10 min) is the simpler alternative. |
| **Thumbnails (text on image)** | ★ **`ideogram/v4.5/edit`** (quality High), with the key frame and character refs | **$0.22/image** (Medium $0.06) | `openai/gpt-image-2/edit` | token-priced (~$0.2 at high quality) | Ideogram is strong at legible title text. |
| **Video composition / FFmpeg** | ★ **Our own render worker** (FFmpeg; see §4) | compute only | `fal-ai/ffmpeg-api/compose` ($0.0002/s), `merge-videos` ($0), `merge-audio-video` ($0.0002/s), `merge-audios`, `loudnorm` ($0) | `compose` = tracks of keyframes `{timestamp, url, duration}` only | fal's FFmpeg endpoints can concatenate and mux, but they **can't burn styled captions, duck music, crossfade, Ken Burns, or reframe 16:9 to 9:16**. Usable as a stopgap for MVP concatenation only. |
| **Captions (if outsourced)** | Burned in by our worker from the alignment (ASS subtitles) | $0 | `fal-ai/workflow-utilities/auto-subtitle` ($0.03/min) / `veed/subtitles` ($0.10/min) | — | Keep caption style under our control (word-pop, position, safe areas). |

**Model IDs confirmed in fal's live catalog (2026-10-11):** every ID above returned `200` from `fal.ai/models/<id>/llms.txt`.

---

## 3. Supabase facts that shape the design

| Area | Fact (source) | Design consequence |
|---|---|---|
| **Edge Functions** | **Wall clock 150 s on Free, 400 s on paid. CPU 2 s per request. 256 MB memory.** 150 s idle timeout before a response. No multithreaded native libraries (no `sharp`, libvips, or FFmpeg). `EdgeRuntime.waitUntil()` runs background work within those limits. Recursive calls are capped at 30 per trace per 60 s. (`guides/functions/limits`) | Edge Functions are fine for **short orchestration steps**: submitting to fal, handling fal webhooks, small LLM calls with streaming, signing URLs. They are **not** fine for rendering, long LLM generations near 400 s, or downloading and transcoding media. |
| **Queues (pgmq)** | Durable Postgres queues with guaranteed, exactly-once delivery inside a visibility window. API: `pgmq_public.send(queue, msg, sleep_seconds)`, `send_batch`, `read(queue, vt_seconds, n)`, `pop`, `delete`, `archive`. Access controlled by RLS. (`guides/queues`, `/api`) | One queue per worker type: `orchestrate`, `fal_submit`, `render`. Messages carry `{project_id, step, scene_id, attempt}`. Visibility timeout = retry. `read_ct` drives the max-attempts check, and failures go to a dead-letter table. |
| **Cron (pg_cron + pg_net)** | Schedules run from every second upward. **Supabase recommends at most 8 concurrent jobs, each under 10 minutes.** `net.http_post` can invoke Edge Functions. (`guides/cron`, `functions/schedule-functions`) | A cron job every few seconds drains `orchestrate`/`fal_submit` by invoking an Edge Function. Another sweeps stuck jobs (poll fal status when a webhook is missing) and reconciles fal costs nightly. |
| **Realtime** | Broadcast is recommended over Postgres Changes for scale and security. `realtime.broadcast_changes()` from triggers, or `realtime.send(payload, event, topic, private)`. Private channels need RLS on `realtime.messages`. DB-broadcast messages are kept 3 days. (`guides/realtime/*`) | A trigger on `jobs` and `scenes` broadcasts to `project:{id}` (private). The UI subscribes for a live progress bar and per-scene thumbnails. |
| **Storage** | Max file size: **Free 50 MB, Pro/Team up to 500 GB** (global setting, plus per-bucket limits). Signed URLs via `createSignedUrl(path, seconds)`, signed with a separate key and not revocable except through support. (`guides/storage/*`) | **Pro is required**, because a 10-minute 1080p master is about 400–800 MB. Private buckets throughout, with short-lived signed URLs handed to fal and to the browser. |
| **Auth + RLS** | Standard. RLS policies on every table key off `auth.uid()`. | Users see only their own projects. Workers use the service role. |
| **Pricing** | **Pro from $25/mo**, including $10 compute credit (one Micro instance), 8 GB database disk, **100 GB storage then $0.0213/GB**, **250 GB egress then $0.09/GB** (cached egress $0.03/GB). Spend caps are on by default. (`pricing.md`) | About 2 GB per finished project (scene clips + master + 20 shorts) gives roughly 50 projects in the included storage. Lifecycle cleanup of intermediates is needed. |

---

## 4. Where long-running work runs: decision

**Decision: a hybrid.**
- **Supabase Edge Functions** do *orchestration*: API endpoints, fal submissions, the fal webhook receiver, and cron-driven queue ticks.
- **One separate containerized render worker** (Node + FFmpeg) handles *media work*: assembly, captions, ducking, reframing, Ken Burns, shorts, upscale handoff, and copying fal outputs to Storage.
- The **Claude script, plan, and research calls** run on the worker too, as a long, streaming LLM job.

**Why:**
1. **Edge limits rule out rendering.** A 2 s CPU budget, 256 MB, 400 s wall clock, and no native FFmpeg mean even concatenating 100 clips plus captions is impossible there.
2. **Long LLM calls are risky in Edge.** A Claude research and script pass with web search and adaptive thinking can run for minutes. 400 s is tight, and streaming keeps the worker busy for the whole time. On the worker there is no ceiling and failures can retry cleanly.
3. **fal does the heavy GPU work** behind its own queue. Edge Functions only need to submit work (milliseconds of CPU) and receive webhooks (milliseconds), which fits comfortably.
4. **One durable source of truth.** Postgres (pgmq plus the `jobs` table) holds both the Edge Function steps and the worker's queue, so a crash anywhere is recoverable by visibility timeout and status polling.
5. **Remotion vs. FFmpeg.** Plain FFmpeg (filtergraphs: `xfade`, `zoompan`, `sidechaincompress`, `loudnorm`, `ass` subtitles) covers everything in scope, and is cheaper and simpler to run headless. Remotion stays an option for animated templates (kinetic typography, lower-thirds) later. It needs Chromium plus a larger container, or Remotion Lambda.

**Worker hosting:** any container host that can run FFmpeg with 2–4 vCPU and about 4 GB of RAM, such as Fly.io Machines, Railway, Render, or a small VPS. The hosting choice is made in Phase 3; it doesn't affect the architecture. A 10-minute 1080p render with captions and ducking takes about 3–8 min of CPU, which is well under $0.10 per render.

---

## 5. Cost estimate: one 10-minute video + 20 shorts

**Assumptions:**
- About 1,500 narrated words, or about 9,000 characters.
- **100 scenes**, averaging 6 s each, for 600 s of visuals (Phase 1: one scene every 5–10 s).
- 3 recurring characters plus 1 style bible.
- 20 shorts of about 45 s each, cut from the master, 9:16 with captions.
- A **15% retry allowance on video generation.**
- Prices are fal and Anthropic list prices today.

| Line item | Budget tier (Ken Burns + 30% animated) | Standard tier (all animated, keyframe → H3 768P) | Premium tier (Omni Flash ref→video 1080p, Higgsfield-like) |
|---|---|---|---|
| LLM: research (≈10 searches), script, chapters, scene plan, titles, shorts selection, 30-day plan (`claude-opus-5-5`; ≈150K in / 60K out incl. thinking; caching on) | ~$1.80 + search fees | ~$1.80 + search | ~$1.80 + search |
| Character sheets + style frames (≈16 × NB2.1 2K @ $0.063) | $1.00 | $1.00 | $1.00 |
| Scene keyframes (100 × NB2.1 1K @ $0.044 + 15% redo) | $5.06 | $5.06 | — (refs go straight to video) |
| Scene motion | 30% × 600 s × $0.06 = **$10.80** | 600 s × $0.06 = **$36.00** | 600 s × $0.15 = **$90.00** |
| Video retry allowance (15%) | $1.62 | $5.40 | $13.50 |
| TTS (9K chars × $0.10/1K) | $0.90 | $0.90 | $0.90 |
| Forced alignment | $0.22 | $0.22 | $0.22 |
| Music bed (3 min × $0.002/s, looped) | $0.36 | $0.36 | $0.36 |
| Thumbnails (6 candidates × Ideogram High $0.22, pick 3) | $1.32 | $1.32 | $1.32 |
| **20 shorts.** Reframe: scenes in shorts get a 9:16 keyframe via NB2.1 edit (≈150 × $0.044); captions and cuts done by the worker. Premium re-renders vertical scenes with Omni at 720p (≈900 s × $0.10). | $6.60 | $6.60 | $90.00 *(or $6.60 if keyframe-reframed)* |
| Render worker compute (master + 20 shorts) | ~$0.15 | ~$0.15 | ~$0.15 |
| **Total per video + 20 shorts** | **≈ $30** | **≈ $59** | **≈ $199** (or **≈ $116** with keyframe-reframed shorts) |
| Optional upscale to 1080p (Topaz, master only) | +$12 | +$12 | n/a (already 1080p) |
| One-time: voice clone | $1.50 | $1.50 | $1.50 |

**Benchmark:** Higgsfield charges about 2,000 credits, or about **$86–150**, for the 10-minute video alone (Phase 1 §6). Our standard tier is about $59 *including* 20 shorts. Our premium tier matches Higgsfield's model choice at a similar raw cost.

**Fixed monthly costs:**
- Supabase Pro $25.
- Worker host about $5–30.
- Claude and fal are pay-as-you-go. Keep a fal balance buffer, because the account **locks below its threshold**.

**Throughput note:** at fal's starting concurrency of **2**, the 100 standard-tier clips of about 6 s each, at roughly 60–120 s per clip, take about **50–100 min**. At concurrency 10 it is about 10–20 min. The limit rises automatically with credit purchases, up to 40.

---

## 6. Open items for Phase 3
- Choose the worker host (Fly Machines vs. Railway vs. VPS).
- Pick the default quality tier, with the user deciding cost vs. look. My recommendation: **standard tier as the default, premium as an upgrade**.
- Prove consistency empirically in M1. Compare:
  - (a) NB2.1 keyframe + H3 image-to-video
  - (b) Omni reference-to-video

  on the same 10 scenes, scoring character identity and style drift.
- Check web-search tool pricing and per-use limits on the Claude API before turning on multi-search research.
- Re-verify every fal price with `/v1/models/pricing/estimate` at build time.

---

## 7. Revision (2026-10-11, user request): R2 storage, Fish Audio TTS, 30-second test videos

See DECISIONS D007.

### 7.1 Cloudflare R2 for all media
| | R2 free tier | R2 paid |
|---|---|---|
| Storage (Standard class) | 10 GB-month | $0.015 / GB-month |
| Class A ops (writes, lists) | 1M / month | $4.50 / M |
| Class B ops (reads) | 10M / month | $0.36 / M |
| Egress | **Free** | **Free** |

**Split of responsibilities:**
- **Supabase:** Auth, Postgres with RLS (the source of truth for who owns what), pgmq, cron, Realtime, Edge Functions.
- **R2:** all media files. Object keys are listed in Postgres.
- **Access:** Edge Functions and the worker sign S3 SigV4 presigned URLs (GET for fal inputs and browser playback, PUT for uploads) after checking ownership in Postgres.
- **fal outputs** are copied into R2 straight away.

**Effects:**
- Zero egress makes playback and downloads free.
- Supabase Free becomes viable during testing.
- Pro is still recommended for production: no pausing, 400 s Edge Functions, backups.

### 7.2 Fish Audio TTS (provider-agnostic interface)
| Model | Price | Notes |
|---|---|---|
| `s2.1-pro-free` | $0 | Fair Use, no SLA, may be used for training, commercial use partly restricted. End date unclear (blog: through Nov 30, 2026). Cloning is said to work. |
| `s2.1-pro` / `s2-pro` | $15 per M UTF-8 bytes (≈12 h of speech) | Concurrency 5, 15, or 50 by total prepaid amount |

- Word timestamps are **not documented**, so pair Fish with `fal-ai/elevenlabs/speech-to-text/scribe-v2` ($0.008/min) for word timing.
- **How much this saves:** TTS was already about 1.5% of the standard-tier cost. Fish free saves about $0.90 per 10-minute video, and paid Fish saves about $0.76 per video against MiniMax HD. **Video generation is about 60–80% of the cost**, so that is where savings matter.

### 7.3 Cost of one 30-second test video (about 5 scenes × 6 s, 9:16, Fish free TTS)
| Item | Budget (Ken Burns) | Standard (keyframe → H3 768P) | Premium (Omni ref→video 720p) |
|---|---|---|---|
| LLM (script + 5-scene plan, Opus 5.5) | ~$0.15 | ~$0.15 | ~$0.15 |
| Character / style refs (4 × NB2.1 2K) | $0.25 | $0.25 | $0.25 |
| Keyframes (5 × $0.044 + redo) | $0.25 | $0.25 | — |
| Motion | $0 | 30 s × $0.06 = $1.80 | 30 s × $0.10 = $3.00 |
| Retry allowance 15% | — | $0.27 | $0.45 |
| TTS (Fish free) + word timing (Scribe) | $0.01 | $0.01 | $0.01 |
| Music (30 s × $0.002) | $0.06 | $0.06 | $0.06 |
| **Total** | **≈ $0.70** | **≈ $2.80** | **≈ $3.90** |

At 30 s, premium (Omni) costs only about $1 more than standard and skips the keyframe step. **M1 should run both on the same topic** to compare consistency.
