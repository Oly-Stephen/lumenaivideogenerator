# Resume Point

**Last updated:** 2026-10-11
**Status:** M1 COMPLETE (D016). fal spend $2.97 of $9. The worker runs locally in live mode. Next: M2 (script/plan approval, redo scene, credits ledger) once the user confirms; Claude provider when the Anthropic key is added.

## Done
- Step 0: REA installed (DECISIONS D001 and D002).
- Phase 1: Reverse engineering done with the REA CLI in an isolated headless browser (D003). Findings are summarized in D004.

## Next: Phase 2 (only after the user's OK), stack research for Supabase + fal.ai
- Read the current fal docs:
  - queue: submit, status, result, webhooks
  - JS and Python clients
  - storage upload
  - rate limits and concurrency
  - pricing
- Pick fal models, with exact IDs, prices, and limits, for each step:
  - LLM
  - image with refs
  - image-to-video
  - TTS
  - voice clone
  - music
  - lip sync
  - upscale
  - FFmpeg/compose
- Read the current Supabase docs:
  - Auth
  - RLS
  - Storage and signed URLs
  - Realtime
  - Edge Function limits
  - pgmq Queues and pg_cron
- Decide where workers run (Edge Functions vs. a separate render worker).
- Write `docs/02_STACK_RESEARCH.md`, with a model table and a cost estimate for one 10-minute video plus 20 shorts.

## Open approvals the user may grant
- Download the public YouTube walkthrough for scene and timing analysis.

## Standing rules
- Research and planning only. No app code until the plan is approved.
- Look only at public pages, or at the user's own session while they are present.
- Never enter credentials. Don't spend credits or install anything without asking.
- Don't copy Higgsfield's code, prompts, branding, or assets.
- Stop after each phase, summarize, and wait for the user's OK.
