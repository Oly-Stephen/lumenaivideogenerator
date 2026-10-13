# Decisions Log

## 2026-10-10 — D001: REA installation approach
- **Context:** REA (Reverse Engineer Anything, `rea-agents` on npm, github.com/morluto/rea) was not installed. Node v22.23.2 meets its engine requirement (`^22.19.0 || ^24.11.0 || >=26.0.0`).
- **Concern:** The package is moving fast (v4.0.1 → v6.3.0 between 2026-10-05 and 2026-10-10).
- **Decision:** Read the setup code before running anything (user chose option A). Tarball `rea-agents@6.3.0` was unpacked to the scratchpad for review only and not executed.
- **Findings:**
  - Claude Code setup writes `mcpServers.rea` into `~/.claude.json` (it backs the file up first).
  - Command: `cmd.exe /d /c npx -y rea-agents@6.3.0 mcp` (the version is pinned).
  - It installs the skill `reverse-engineer-anything` to `~/.claude/skills/reverse-engineer-anything/` (SKILL.md plus 5 reference .md files).
  - It may offer to install Hopper; we decline, because this project only needs website analysis.
  - Setup is interactive (`@clack/prompts`). The only non-interactive option is `--yes`, which approves every action for every detected agent. This machine has Codex, Cursor, Gemini, and others configured, so `--yes` will not be used.
- **Status:** Resolved by D002.

## 2026-10-10 — D002: Register REA by hand for Claude Code only
- **Decision:** The user said "set this up for me", so REA was registered by hand instead of through the interactive setup, which a non-interactive shell can't drive.
- **Changes made:**
  - Backed up `~/.claude.json` to `~/.claude.json.rea.backup`.
  - Added `mcpServers.rea` to `~/.claude.json`.
  - Copied the skill to `~/.claude/skills/reverse-engineer-anything/`.
- **Verified:** `npx -y rea-agents@6.3.0 doctor --client claude_code --json` reports `registration:claude_code` as healthy.
- **Not done (not needed):**
  - Hopper, Ghidra, and IDA engines
  - Claude Desktop registration
  - Other agents (Codex, Cursor, and so on)
- **To undo:** restore the backup file and delete the skill folder.

## 2026-10-11 — D003: Use REA through its CLI, in an isolated headless browser
- **Context:** After "resume", the REA MCP tools were not loaded in this session. The registration is healthy, but this conversation probably didn't restart. REA's CLI, `npx rea-agents@6.3.0 <command>`, is the same engine.
- **Decision:** Use the REA CLI for `list-browser-targets`, `inspect-web-page`, `analyze-web-bundle`, and `export-web-scripts`. Run them against a separate headless Chrome with a throwaway profile in the scratchpad, so none of the user's sessions or cookies are involved. Pages were visited logged out only. Raw CDP was used only for passive network capture, because REA attaches after page load. That browser was shut down afterwards.
- **Not done (needs user approval):**
  - A logged-in generation, which costs about 200 credits per minute.
  - The MCP OAuth tool listing.
  - Downloading the YouTube walkthrough video.

## 2026-10-11 — D004: Key findings that shape the design
- The Higgsfield model is an async **job set**: submit, then get a `job_sets[]` response, then poll `/job-sets/{id}`. Their public API uses `Idempotency-Key`, concurrency limits, refunds on failure, and 7-day output retention. Our design will mirror these properties.
- **Audio-first timing:** narration drives scene alignment.
- About **100 scenes** per 10 minutes (one scene every 5–10 s).
- The cost benchmark is ~200 credits/min, about $9–15/min retail. This is the price point our fal.ai stack should beat.

## 2026-10-11 — D005: Higgsfield account suspended during the logged-in test
- **What happened:** The user approved a 1-minute test render (about 200 credits) to observe the job graph. They logged in themselves in the built-in browser. When Claude clicked "Start creating", a bot-verification slider appeared. Claude did not complete it. Shortly afterwards the user reported that the account had been suspended.
- **Likely trigger:** automated traffic from the same machine and IP:
  - headless page loads
  - REA exporting about 1,500 JavaScript chunks
  - unauthenticated probes of the API and MCP
  - automated clicks right after login
- **Outcome:**
  - No generation was submitted and no credits were spent.
  - All Higgsfield activity stopped.
  - The user was given an appeal draft to send to Higgsfield support themselves.
- **New rules from the user:**
  - Higgsfield public pages may be read for research at any time.
  - **Never sign in.**
- **Lesson:** keep Higgsfield research light and human-paced: single page reads, no bulk script exports, no endpoint probing. Warn the user about bot-detection risk before any logged-in automation on third-party sites.
- **Impact:** The internal job graph (Phase 1, open question #1) stays unknown. Our design does not depend on it.

## 2026-10-11 — D006: Stack choices (Phase 2)
- **LLM:** Claude API direct, `claude-opus-5-5`, with web search, structured outputs, and caching. fal has no first-party strong LLM; `openrouter/router` is the fallback. `claude-fable-5-1` is an opt-in only if evals show a need.
- **Images:** `google/nano-banana-2.1/edit` (14 refs, seed, system prompt). Fallback: `bytedance/seedream/v5/lite/edit`.
- **Video:** three quality tiers.
  - Budget: keyframe + Ken Burns in the worker.
  - Standard (default): keyframe → `minimax/h3/image-to-video` at 768P. Fallback: `alibaba/wan-3.0/image-to-video`.
  - Premium: `google/gemini-omni-flash/v1.1/reference-to-video`, the model Higgsfield uses.
- **Audio:**
  - TTS: `fal-ai/minimax/speech-2.8-hd`, one engine for library and cloned voices.
  - Alignment: `fal-ai/elevenlabs/forced-alignment`.
  - Cloning: `fal-ai/minimax/voice-clone` (the clone must be used within 7 days or it's deleted).
  - Music: `minimax/music-3`.
- **Where the work runs:** a hybrid. Edge Functions handle orchestration and fal webhooks (2 s CPU / 400 s wall clock / 256 MB limits). A separate Node + FFmpeg container handles rendering and long LLM calls. Postgres (pgmq + `jobs`) is the source of truth.
- **Supabase Pro is required:** the Free plan caps files at 50 MB, and the master video is 400–800 MB.
- **Cost estimate** for a 10-minute video plus 20 shorts: about $30 (budget), $59 (standard), $116–199 (premium).

## 2026-10-11 — D007: Storage on R2, TTS on Fish Audio for testing, 30-second test videos
- **Media storage: Cloudflare R2.** The free tier gives 10 GB-month, 1M Class A ops, 10M Class B ops, and **zero egress**. Beyond that: $0.015/GB-month, $4.50 per million Class A ops, $0.36 per million Class B ops (developers.cloudflare.com/r2/pricing).
  - R2 holds every media file: references, keyframes, clips, audio, renders, shorts.
  - Supabase keeps Auth, Postgres/RLS, pgmq, cron, Realtime, and Edge Functions.
  - Access goes through S3-style presigned URLs that our backend issues after an ownership check in Postgres. fal accepts presigned URLs as inputs. R2 has no RLS, so the bucket stays private and only the backend signs URLs.
  - This removes the Supabase Pro requirement for media during testing, because the Free plan's 50 MB file cap no longer matters.
  - Caveats of Supabase Free: projects pause after inactivity, and Edge Functions get 150 s of wall clock.
  - About 10 GB holds hundreds of 30-second test projects.
- **TTS: Fish Audio behind a provider interface.**
  - `s2.1-pro-free` costs $0 per million UTF-8 bytes. It has a Fair Use policy, no SLA, and requests may be used for training. Some commercial use is restricted. The end date is unclear: the blog says through Nov 30, 2026, and the docs give none. Voice cloning is said to work on the free tier.
  - Paid `s2.1-pro` costs $15 per million UTF-8 bytes, about $0.14 for a 10-minute script versus $0.90 on MiniMax HD.
  - Concurrency is 5, 15, or 50 depending on total prepaid amount.
  - Fish does not document word timestamps, so we pair it with `fal-ai/elevenlabs/speech-to-text/scribe-v2` ($0.008/min) for word timing.
  - **Use:** Fish free for development and tests. Before any commercial launch, switch to paid Fish or MiniMax (`fal-ai/minimax/speech-2.8-hd`).
- **Test scope:** build the UI for both formats, short (9:16, about 30 s) and full (16:9, up to 10 min). Generate only 30-second, roughly 5-scene videos until the pipeline is proven.

## 2026-10-11 — D008: Implementation plan (Phase 3) drafted
- **Architecture:**
  - Next.js on Vercel.
  - Supabase: Auth, Postgres with RLS, pgmq queues (`orchestrate`, `fal_submit`, `llm`, `ingest`, `render`), pg_cron ticks, Realtime private broadcast, Edge Functions.
  - Cloudflare R2 for media.
  - A Node + FFmpeg worker. Proposed host: Fly.io, pricing to verify at M0.
- **Pipeline:**
  - Two human checkpoints, script approval and plan/cost approval, with an autopilot toggle for tests.
  - Audio-first timing: the scene planner assigns word ranges, not durations.
  - Keyframe-first consistency, auto-QA, and auto-degrade to Ken Burns.
  - Idempotency keys on jobs and on the ledger.
- **Credits:** 1 credit = $0.01 of list cost × markup (1.0 while testing). The ledger uses reservations, charges, and releases.
- **Milestones:**
  - M0 foundations
  - M1 30-second Short end to end
  - M2 control and credits
  - M3 consistency experiment and premium tier
  - M4 Full format up to 10 minutes
  - M5 voices and dubbing
  - M6 extras
  - M7 hardening

  Estimated about 30–41 developer-days, with M0–M1 about 7–10 days.
- **Status:** awaiting user approval.

## 2026-10-11 — D009: fal.ai test budget is $10
- A hard cap is enforced in code (`FAL_TOTAL_BUDGET_USD=9`), plus a daily cap of $3. Each live run needs confirmation.
- Development defaults to replay/mock provider modes. Live runs are recorded once and replayed for free.
- Test settings: 1K keyframes and 480P motion (H3 at $0.05/s).
- Planned spend is about $6.30:
  - smoke test
  - 4 budget-tier and 1 standard-tier 30-second Shorts
  - a 3-scene consistency check (H3 vs Omni at 360p)
  - 2 redo tests
- About $2.25 margin and $1.50 reserve are left for fal's lock threshold.
- The full M3 experiment, long-form, and extras wait for more budget.

## 2026-10-11 — D010: M0 scaffold
- The project now has its **own git repo** in `aivideomaker/`. The parent repo is rooted at the user's home folder, which is unsafe to commit to.
- **Worker host:** Fly.io by default. It isn't needed until deploy, and locally the worker runs in Docker.
- **Pinned dependencies:** latest releases at least 2 weeks old (published before 2026-09-27):
  - next 16.3.6, react 19.3.0
  - @supabase/supabase-js 2.117.2, @supabase/ssr 0.12.7
  - pg 8.23.0, aws4fetch 1.0.20
  - typescript 6.0.3 (not 7.x, for tooling compatibility), vitest 5.0.2, tsx 4.23.15
  - supabase CLI 2.118.0, tailwind 4.3.3
- **Webhook handling:** applied through an idempotent SQL function, `apply_fal_webhook` (dedupe in `webhook_events`, guarded job update, then enqueue). The Edge Function only verifies the ED25519 signature.

## 2026-10-11 — D011: Hosted Supabase via MCP instead of local Docker (user request)
- **Supabase project `lumen`** (`tcfexztdhocxwnxxnknu`, us-east-1, free, $0/mo) was created through the Supabase MCP.
  - Applied migrations: `init` and `harden_functions`.
- **Database checks:** run on the hosted project inside a DO block that raises at the end, so everything rolls back and no data persists. 20/20 initial checks passed, plus 4/4 re-checks after hardening.
- **Security advisor:** fixed the mutable search_path warnings and the trigger functions exposed over RPC. RLS helpers moved to a non-exposed `private` schema. The remaining INFO note is `webhook_events` having no policies, which is intentional because only the service role uses it.
- **Edge Function `fal-webhook`** is deployed with `verify_jwt=false`, since authentication is the ED25519 signature. Probes: GET returns 405, unsigned POST returns 401, forged signature returns 401.
- **R2:** at the user's request, the old `aivideo` bucket was deleted and the private `lumen-media` bucket created.
- **npm:** installed with `--legacy-peer-deps` to work around an npm arborist crash. `vite` 8.3.0 was added explicitly.
- **R2 presign fix:** PUT URLs now sign `content-type` (`allHeaders`).
- **Secrets:** the user had put a Fish API key in `.env.example`. It was moved to the gitignored `.env` before any commit.

## 2026-10-11 — D012: M0 complete
- **All M0 acceptance checks pass on hosted infrastructure:**
  - unit tests 31/31
  - RLS/DB checks 20/20 + 4/4, advisor clean
  - R2 presigned PUT/GET (wrong content-type gets 403, unsigned gets 400)
  - fal-webhook rejects unsigned and forged calls
  - sign-url boots with its R2 secrets
  - the worker consumes and acks a pgmq message through the session pooler
- **fal smoke test:** request `01a129d1-81fc-7030-a94e-65f8bafc4fe7`, `google/nano-banana-2.1/edit` at 1K, read an R2 presigned URL successfully.
- **fal spend log (manual until M1 job accounting):** about $0.044 so far (estimate; reconcile with fal usage). Cap $9.
- **Incident:** a DB connection string, password included, was printed unmasked in tool output. The user reset the password immediately. Rule from now on: only print parsed username/host/port, never the raw value.

## 2026-10-11 — D013: M1 implementation choices
- **Manual LLM mode (user request):** there is no Anthropic key yet, so research, script, and plan are authored by Claude in the dev session.
  - They are stored as `fixtures/llm/<slug>.json` and validated by the same zod schemas the Claude provider will use.
  - Sources were checked: Herbst et al. 2023 and McComb et al. 2009, both in Current Biology.
  - If no file matches the topic, the project waits in `researching` with a clear message and re-polls every 30 s.
- **Orchestrator runs in the worker (Node)** for M1, consuming the `orchestrate` pgmq queue one step per message, instead of SQL `advance_project` plus an Edge cron. fal is polled, not webhooked, in M1. The deployed `fal-webhook` stays ready for M2.
- **M1 runs on autopilot.** Script and plan approval screens move to M2.
- **Provider modes:**
  - `mock`: placeholder media at $0.
  - `replay`: default; reuses recorded fal results at $0.
  - `live`: needs explicit opt-in. Records fixtures and enforces the $9 total and $3 daily caps in `FalClient.assertBudget`.
- **Voices:** Fish public-library voices "Ethan" and "Sarah" are used for testing only. Community voices may be clones of real people, so we replace them with our own designed voices before launch.
- **Render check:** loudness hits −14.0 LUFS, and pop-word captions are verified on a mock render.
- **New dependencies (approved):** ffmpeg-static 5.3.0 (FFmpeg 6.1.1), ffprobe-static 3.1.0, zod 4.6.5.

## 2026-10-11 — D014: First live 30-second Short (Budget tier)
- **Project:** `f1ec19e9…`. Output: 27.8 s, 1080×1920, 5 scenes (2 animated with H3 480P, 3 Ken Burns), Fish "s2.1-pro-free" narration, Stable Audio bed, pop-word captions.
- **Total fal spend so far:** **$0.91**, including the M0 smoke test.
- **Fixes made during the run:**
  - `minimax/music-3` requires lyrics (it's a song model). Music moved to `fal-ai/stable-audio-3/medium/text-to-audio`: $0.0376/generation, instrumental, with a negative prompt.
  - Retrying fetch for transient DNS errors.
  - Resume-from-failed-step Retry.
  - CORS on `sign-url`, restricted to allowed origins.
  - A job that fails while fetching its result is marked failed, so it stops counting toward the budget.
- **Review findings:**
  - Character consistency across scenes is strong (same tabby, teal collar, gold bell). The style is consistent.
  - Loudness came out at −15.5 LUFS against a −14 target, because single-pass loudnorm undershoots. Switch to two-pass.
  - The "keep the lower 22% uncluttered" instruction makes the model leave empty bands. Change it to "keep important details out of the bottom fifth; fill the frame".
  - The anatomy diagram scene (vocal folds) reads poorly, so diagram prompts need concrete visual metaphors.

## 2026-10-11 — D015: Budget-guard bugs found and fixed; daily cap raised to $6 (user-approved)
- **Bug 1:** the daily-spend sum counted queued, never-submitted jobs, including the job being checked. It tripped the cap at a "$2.93" day when real spend was $1.93. It now counts only reconciled cost plus submitted/in-flight estimates.
- **Bug 2 (serious):** a numeric env with an inline comment (`FAL_TOTAL_BUDGET_USD=9.00   # …`) parsed to NaN, which silently disabled the total cap. Nothing was overspent (total $1.93). `num()` now strips comments, and the worker **refuses to start** on a non-numeric cap.
- **Daily cap** raised to $6 at the user's request. The total cap stays at $9.

## 2026-10-11 — D016: M1 complete (30-second Short, end to end)
- **Standard run** (`5a4e1f06…`): all 5 scenes animated (H3 480P), 28.2 s, 1080×1920, −14.7 LUFS. The fill-the-frame prompt fixed the empty bands, and the rewritten lab-diagram scene reads clearly. Run cost about $2.04. **Total fal spend: $2.97 / $9.**
- **Queue leases:** visibility timeouts cut to 120 s, and a running handler renews its lease every 45 s (`pgmq.set_vt`). Before this, a crashed step stayed hidden for 30 minutes.
- **Crash test:** the worker was killed mid-render. After restart, the message reappeared within 2 minutes and the project completed. No new fal jobs were created (26 → 26) and spend was unchanged ($2.9712).
- **M1 acceptance results:**
  - duration 26–34 s ✓
  - 1080×1920 at 30 fps ✓
  - −14 ±1 LUFS ✓
  - character consistent ✓ (manual review; auto-QA scoring needs the Claude key, so it's deferred)
  - crash resume ✓
  - duplicate webhook idempotent ✓ (DB-level test; M1 polls)
  - cost: Standard $2.04 (limit $3.50) ✓, Budget $0.89 (limit $1) ✓
- **Not yet measured:** caption sync within ±150 ms as a numeric metric. It's correct on visual review.

## 2026-10-12 — D017: M2 (Claude provider, approvals with cost, redo, cancel, credits ledger)
- **Claude provider** (`@anthropic-ai/sdk` 0.128.0, ≥2 weeks old):
  - research uses `web_search_20260209` with free-text notes
  - script and plan use `beta.messages.parse` + `zodOutputFormat`
  - default models are Sonnet 5.5 per step; Opus 5.5 for "High-quality writing" and as the escalation after two failed plan validations
  - refusal fallback `fallbacks:"default"`
  - usage is recorded as `jobs` (provider `anthropic`) and charged in credits; separate cap `LLM_DAILY_BUDGET_USD`
  - mock mode and `LLM_PROVIDER=manual` never call Claude
- **Credits:** 1 credit = $0.01 × `app_config.credit_markup`.
  - The ledger functions `ledger_reserve` / `ledger_charge` / `ledger_settle` / `admin_grant` / `admin_refund` lock the profile row.
  - A plan approval holds the estimate. Each finished job turns part of the hold into a charge. Completion, failure, and cancel release the rest.
  - The user received a 600-credit grant (`scripts/grant-credits.ts`).
- **Estimate:** shared in `packages/core/src/estimate.ts` (words ÷ 2.5, H3 duration rules, +15% buffer). It covers what was actually paid: Standard $2.48 estimated vs $2.04 paid, Budget $1.10 vs $0.89.
- **Fixes found by tests:**
  - (a) Ledger FK nulling: the append-only trigger now allows `ON DELETE SET NULL` only.
  - (b) **Cancel is final:** a trigger keeps `canceled` even if a worker step finishes afterwards. This was a real race, caught by E2E.
  - (c) The daily cap counts charges today plus holds outstanding, not gross reservations.
- **Tests:**
  - 49 unit tests
  - 19 ledger/RPC SQL checks plus 3 FK checks (rolled back)
  - a concurrency test: two sessions reserving 400 of 600, so B waits for A's lock and is rejected
  - mock E2E 13/13 (`scripts/e2e-m2.ts`), including a redo with re-assembly in 48 s
- **Advisor:** the new `rpc_*` SECURITY DEFINER warnings are intentional (user-facing, each checks `auth.uid()` ownership and status). Leaked-password protection is an Auth setting the user enables in the dashboard.
- **Follow-up for M7:** deleting a whole user account must bypass the append-only ledger trigger (cascade delete).

## 2026-10-11 — D018: fal caps raised (user-approved after adding fal credit)
- **New caps:** total `FAL_TOTAL_BUDGET_USD` $9 → **$15**; daily `GLOBAL_DAILY_SPEND_USD` $6 → **$8**. Spend at the time of the change: $5.86.
- **Context:** "What If You Never Slept Again?" (Claude-written, 10 scenes) had motion turned on for 9 of 10 scenes by the user. 341 credits were charged against a 366-credit hold, so the estimate covered it.
- **Finding:** Claude's plan produced many 4–7-word scenes (2–3 s), but H3 bills a 5 s minimum. Follow-up: route scenes under 5 s to Wan 3.0 (2 s minimum), or tell the planner to prefer ≥ 4 s scenes.
- The `ANTHROPIC_WORKSPACE_ID` header was added for keys not scoped to a workspace.

## 2026-10-11 — D019: First Claude-written video (live verification #1)
- **"What If You Never Slept Again?"**: Sonnet 5.5 research, script, and plan; 10 scenes, all animated by the user's choice; Paper Cut-out style. 31.6 s, −14.9 LUFS.
- **Cost:** Claude $0.435 (research $0.38 including web search, script $0.04, plan $0.03). fal $3.18. Credits: estimate 366 → charged 370, then settled (hold 0). **fal total $6.15 / $15.**
- **Quality review:**
  - The style is consistent, and the recurring characters (teen, fly) are recognisable.
  - **Issues:**
    - The image model drew a "2024" calendar in the 2020 Harvard scene. That's text despite the no-text rule, and a factual mismatch.
    - Slight drift on the teen (glasses appear in one scene only).
    - One claim ("saw a forest on day 5") is sourced to a weak site (mamamia.com.au).
  - **Follow-ups:**
    - Steer the researcher to primary or high-reputation sources, and flag weak-source claims in Script Review.
    - Add "no calendars or dates" to diagram prompts.
    - Use the auto-QA pass (Haiku vision) once wired.

## 2026-10-11 — D020: Live redo verified; worker crash on pooler reset fixed
- **Live verification #2.** Redo scene #5 of the sleep video, with a new image and motion and a prompt asking for no calendars or text.
  - Ledger: hold 34, charges 5 + 25, unused 4 released, outstanding 0.
  - The new keyframe has no calendar, and the same fly character and style are kept.
  - Only that scene was regenerated, and a new render was produced. **M2 live verification is complete.**
- **Crash:** the Supabase pooler reset an idle connection (ECONNRESET). pg emits an 'error' event on the pool, and with no listener the Node process exited.
  - Fix: `db.on('error')` and an `unhandledRejection` logger, plus `keepAlive` and an idle timeout.
  - Verified by terminating the pool's backend from another session: the next query succeeds.
- **Root cause of the "2024" calendar:** Claude's plan itself asked for "calendar page flipping to a year marker".
  - The planner system prompt now forbids dates, years, numbers, calendars, clocks, signs, and documents in visuals, and suggests visual metaphors instead.
- **fal total:** $6.45 / $15.

## 2026-10-11 — D021: UI/UX direction and design skills
- **Vendored 4 MIT design skills into `.claude/skills/`** (sources and commits in `SOURCES.md`):
  - `apple-design` (Emil Kowalski)
  - `design-taste-frontend` (Leonxlnx)
  - `hig-foundations` and `hig-patterns` (Raintree)
- **How they were installed:** with `git clone` plus a manual review, instead of `npx skills add`, so no third-party installer was run.
- **Direction** (`docs/04_UI_UX_RESEARCH.md`): a calm, Apple-like product UI.
  - Taste dials 4/3/4: neutral zinc colours, one teal accent, Geist font, Phosphor icons, CSS-only motion.
  - Cost is shown on every button that spends credits.
  - The generating screen shows stages, and keyframes appear one by one as they finish.
  - A Redo sheet with version history.
- **Proposed new dependency:** `@phosphor-icons/react@2.1.10`. It is waiting for approval.
