# Lumen

Lumen makes narrated 2D explainer videos from a topic or a script, in two formats: **Short** (9:16) and **Full** (16:9).

Design documents are in [`docs/`](docs). Read [03_IMPLEMENTATION_PLAN.md](docs/03_IMPLEMENTATION_PLAN.md) first; decisions are logged in [DECISIONS.md](docs/DECISIONS.md).

## Layout
```
apps/web         Next.js app (UI)
apps/worker      Node + FFmpeg worker (LLM, ingest, render queues)
packages/core    state machines, idempotency keys, timing math (shared, tested)
supabase/        migrations, pgTAP RLS tests, Edge Functions (sign-url, fal-webhook)
scripts/         one-off scripts (smoke-fal: the only live fal call in M0)
infra/           Dockerfile.worker
```

## Local setup (M0)
1. Install Node 22.19+ and **Docker Desktop**. Start Docker Desktop; the local Supabase stack runs in it.
2. Install dependencies and start the local stack:
   ```bash
   npm install
   ```
   ```bash
   npx supabase init
   ```
   Running `init` creates `supabase/config.toml`. Then set `verify_jwt = false` under `[functions.fal-webhook]`.
   ```bash
   npx supabase start
   ```
3. Copy `.env.example` to `.env` and fill in the keys. **Never commit `.env`.**
4. Run the checks:
   ```bash
   npm test
   ```
   ```bash
   npx supabase db reset
   ```
   ```bash
   npx supabase test db
   ```
5. Run the worker:
   ```bash
   npm run dev:worker
   ```
   And the web app:
   ```bash
   npm run dev:web
   ```

## Spending guardrails (test phase)
- The fal budget is **$10**. A hard cap of `FAL_TOTAL_BUDGET_USD=9` is enforced in code (DECISIONS D009).
- `PROVIDER_MODE=replay` is the default. A live call needs an explicit `live` setting and confirmation.
