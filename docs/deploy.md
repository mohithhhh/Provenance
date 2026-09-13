# Deploying

Frontend on Cloudflare Pages, backend on Render. Both need your own accounts
and a GitHub connection — this doc is the steps, not something that runs
itself.

## Why this split

`apps/web` builds to a fully static site (`npm run build` produces
`apps/web/out/` — every route here is client-rendered against `apps/api`,
no Next.js API routes or server actions), which is exactly what Cloudflare
Pages wants: no adapter, no server runtime, just static files. `apps/api`
needs a real Python process (torch, transformers, sentencepiece, fastembed,
c2pa-python — genuine ML models, not something a static host or edge
Worker runtime can run), so it goes to Render as a Docker web service.

## Backend: Render

1. Push this repo to GitHub (if not already).
2. Render dashboard → **New** → **Blueprint** → connect the repo. Render
   finds `render.yaml` at the repo root automatically and provisions the
   `provenance-api` service (Docker, `apps/api/Dockerfile`,
   `healthCheckPath: /health`).
3. **`render.yaml` sets `plan: standard` (2GB RAM / 1 CPU, ~$25/mo) —
   Starter (512MB) measured too small.** This project's own process,
   locally, with Modules B and C's models plus the Attack Lab's
   paraphraser all loaded, measured **~650-700MB RSS** — already over
   Starter's 512MB before counting fastembed's embedding model or normal
   request overhead. Raise it further if you still hit OOM restarts; these
   are Render's legacy plan names, still valid in Blueprint files
   alongside the newer resource-based IDs (`standard` ≡ `1c-2g`).
4. Leave `ALLOWED_ORIGINS` unset for now (`render.yaml` marks it
   `sync: false` so Render prompts rather than deploying a guess) — you'll
   set it in step 3 of the frontend section below, once the Cloudflare
   Pages URL exists.
5. Deploy. Note the resulting URL (`https://provenance-api-xxxx.onrender.com`
   or your custom name) — the frontend needs it.

**Known limitation, not fixed here**: Render's default filesystem is
ephemeral. Every redeploy or restart re-downloads every lazily-loaded model
(gpt2, distilgpt2, the fastembed embedding model, the T5 paraphraser —
gigabytes combined) from scratch on the next request that needs it, adding
real cold-start latency after every deploy. A persistent disk (a paid
Render add-on) would fix this; out of scope for this pass — see
`docs/limitations.md`-style honesty: this is a real, known tradeoff, not
something quietly assumed away.

## Frontend: Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git** → select this repo.
2. Build settings (this is an npm-workspaces monorepo, so build from the
   repo root, not `apps/web`):
   - **Root directory**: `/` (repo root)
   - **Build command**: `npm install && npm run build:packages && npm run build --workspace=apps/web`
   - **Build output directory**: `apps/web/out`
   - **Framework preset**: None (a plain static site — the commands above
     already produce the static export Cloudflare Pages wants directly)
3. **`wrangler.jsonc` at the repo root is required.** Cloudflare's current
   dashboard deploy flow for this kind of project runs through **Workers
   Static Assets**, not classic Pages (confirmed live: it runs
   `npx wrangler versions upload`, not `wrangler pages deploy`) — and that
   command needs its own config to know where the built files are, since
   the dashboard's "Build output directory" field alone isn't read by it.
   Without any config: `The Cloudflare application detection logic has
been run in the root of a workspace instead of targeting a specific
project`. With the wrong key (`pages_build_output_dir`, which is only
   for the classic Pages pipeline): `Missing entry-point to Worker script
or to assets directory`. The key this path actually reads is
   `assets.directory` — this repo's `wrangler.jsonc` already has it
   pointing at `apps/web/out`, with no `main` entry (there's no Worker
   script, this is assets-only). No action needed unless you've renamed
   `apps/web`.
4. **Build-time environment variable** (Cloudflare Pages → your project →
   Settings → Environment variables): `NEXT_PUBLIC_API_URL` = the Render
   URL from the backend section above. This is baked in at build time for
   a static export (`apps/web/src/lib/api.ts` reads
   `process.env.NEXT_PUBLIC_API_URL`), not read at runtime — changing it
   means rebuilding, not just restarting.
5. Deploy. Note the resulting `*.pages.dev` URL (or your custom domain).
6. Back on Render: set `ALLOWED_ORIGINS` to that URL (comma-separated if
   you have more than one, e.g. a custom domain and the `*.pages.dev` one)
   and let the backend redeploy so CORS actually allows the real frontend
   origin instead of the permissive local-dev default (`*`).

## Verifying it worked

- `curl https://<your-render-url>/health` → `{"status":"ok"}`
- Open the Cloudflare Pages URL, try the Statistical Detector or Trained
  Classifier pages (Modules B/C) — first request after a cold Render
  instance will be slow (model load, see above); subsequent ones fast.
- A CORS error in the browser console on the deployed site almost always
  means `ALLOWED_ORIGINS` doesn't (yet) include the exact frontend origin.
