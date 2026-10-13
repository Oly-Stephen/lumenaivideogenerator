# Deploying Whyfold to whyfold.app

**Pieces:**
- **Website:** Next.js in `apps/web`, hosted on **Vercel**.
- **Worker:** `apps/worker`, makes the videos and needs ffmpeg, hosted on **Railway** (`railway.json` + `infra/Dockerfile.worker`).
- **Already online:** Supabase (database, auth, Edge Functions) and Cloudflare R2. The **domain** is on Cloudflare.

**Who does what:** you enter every key and secret in each dashboard. They never go into git or into chat. Only variable *names* are listed below.

---

## 1. Website on Vercel (about 10 minutes)

1. Go to [vercel.com](https://vercel.com) and **sign up with GitHub**.
2. **Add New → Project →** import `Oly-Stephen/lumenaivideogenerator`.
3. Configure:
   - **Root Directory:** `apps/web`. Leave "Include files outside the root directory" **on**, because the app uses `packages/core`.
   - **Framework preset:** Next.js (auto-detected). Leave the build and install commands at their defaults. The repo's `.npmrc` handles the npm workaround.
4. **Environment Variables:** copy the values from your `apps/web/.env.local`:

   | Name | Note |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | public |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public anon key (safe in the browser; RLS protects data) |
   | `NEXT_PUBLIC_TEST_MOTION_RES` | e.g. `480P` (optional) |

5. **Deploy.** You get a `*.vercel.app` address. Check that it loads.
6. **Settings → Domains → Add** `whyfold.app`, and also `www.whyfold.app` set to redirect to it. Vercel shows the DNS records to create.

## 2. Point whyfold.app at Vercel (Cloudflare DNS)

In **Cloudflare → whyfold.app → DNS → Records**, add exactly what Vercel shows. Usually:

| Type | Name | Content | Proxy status |
|---|---|---|---|
| `A` | `@` | the IP Vercel shows | **DNS only** (grey cloud) |
| `CNAME` | `www` | the target Vercel shows | **DNS only** (grey cloud) |

- **Use the grey cloud ("DNS only").** Vercel issues the HTTPS certificate itself, and Cloudflare's proxy in front of it causes certificate and redirect loops.
- **HTTPS is mandatory on .app.** Wait until Vercel shows the domain as **Valid** (usually a few minutes) before opening it.

## 3. Worker on Railway (about 10 minutes, ~$5/month)

1. Go to [railway.com](https://railway.com), **sign up with GitHub**, and add a payment method. The worker must run all the time.
2. **New Project → Deploy from GitHub repo →** `lumenaivideogenerator`. Railway reads `railway.json` and builds `infra/Dockerfile.worker`.
3. **Variables:** copy the values from your root `.env` (every name in `.env.example` **except** the `NEXT_PUBLIC_*` ones):
   - **Required:**
     - Database and storage: `DATABASE_URL` (the session pooler URL), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
     - AI providers: `FAL_KEY`, `FISH_API_KEY`, `ANTHROPIC_API_KEY`, `ANTHROPIC_WORKSPACE_ID`
   - **Spend limits** (keep yours): `FAL_TOTAL_BUDGET_USD`, `GLOBAL_DAILY_SPEND_USD`, `LLM_DAILY_BUDGET_USD`
   - **Model choices and limits:** everything else in `.env.example` you have set (endpoints, `LLM_MODEL_*`, `MAX_*`, `TEST_*`, …)
   - **Leave out:** `PORT` and `RENDER_TMP_DIR` (set by the image or Railway); `PROVIDER_MODE` defaults to `live` in the image.
4. **Deploy.** The health check is `/healthz`. In the logs, look for `worker started (PROVIDER_MODE=live …)`.
5. **Stop the local worker** on your computer once Railway's is running. Two live workers would split the jobs between them. The job queue keeps that safe, but it makes problems harder to trace, so run just one.

## 4. Supabase settings for the new address

1. **Authentication → URL Configuration:**
   - **Site URL:** `https://whyfold.app`
   - **Redirect URLs:** add `https://whyfold.app/**`, and keep `http://localhost:3000/**` for development.
2. **Edge Functions → Secrets:** set `ALLOWED_ORIGINS` to `https://whyfold.app,http://localhost:3000`. Without this, videos and thumbnails won't load on the live site, because `sign-url` only answers allowed origins.
3. **Authentication → Providers / Security:** turn on **leaked-password protection**. It's on the open to-do list.

## 5. Check it live

**Website and sign-in:**
- [ ] `https://whyfold.app` shows the landing page with a padlock (HTTPS).
- [ ] Sign up with a new email. The confirmation email link goes to `whyfold.app`, not localhost.

**Your existing videos:**
- [ ] Sign in. The Library thumbnails and the sleep video play. This proves `ALLOWED_ORIGINS` is set.

**A real test video:**
- [ ] Create a test video: a 15 s Short on Budget, approvals on. Approve the script and storyboard and watch it finish. This is real fal spend, about $0.60–1.
- [ ] The Railway logs show the job steps. The local worker is off.
