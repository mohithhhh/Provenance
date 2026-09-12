# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Provenance is a multi-method AI-content detection suite (portfolio project,
working title). Seven independent modules (A–G) feed one ensemble layer that
shows _disagreement_ between methods rather than hiding it behind a single
confidence score. It's built to be technically credible: real math, real
tests, real evaluation numbers — no hand-waved claims. See `README.md` for
the full pitch and `docs/limitations.md` for honest caveats before making any
claim about what a module can detect.

**Build order matters here**: modules are built one phase at a time, each
phase landing tests + a working UI panel + a commit before the next starts
(see the checklist in `README.md`). Don't jump ahead to a not-yet-built
module's plumbing.

## Monorepo layout

```
/apps/web                 — Next.js 16 + TypeScript + Tailwind frontend
/apps/api                 — FastAPI (Python 3.11) backend, for modules needing a real LM/embeddings/sklearn
/packages/watermark-core  — Shared TS watermarking + z-test logic, no UI deps (npm workspace)
/reference                — Empty placeholder for a prototype that was never added; nothing depends on it
/docs                      — architecture.md (module design notes), benchmark.md, dataset.md, limitations.md
```

`apps/web` runs entirely client-side for the Watermark Lab (Module A); it
only needs `apps/api` running for the Ledger (Module F) and Detect (Module B)
pages.

## Commands

Root (npm workspaces: `apps/web` + `packages/*`):

```bash
npm install
npm run dev:web          # apps/web dev server → http://localhost:3000
npm run build:packages   # must run before typecheck/test/build — web depends on watermark-core's dist
npm run lint             # --workspaces --if-present
npm run typecheck        # builds packages first, then typechecks workspaces
npm run test             # builds packages first, then runs workspace tests (vitest)
npm run format / format:check   # prettier over the whole repo
```

Single test file / single package, run from that package's directory
(`apps/web` or `packages/watermark-core`):

```bash
npx vitest run src/path/to/file.test.ts
npx vitest run -t "test name substring"
```

Backend (`apps/api`), Python 3.11 pinned — see "why 3.11" note below:

```bash
cd apps/api
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload    # http://localhost:8000
pytest                            # all tests
pytest tests/test_ledger.py -k some_test   # single test
ruff check .
mypy .
```

Everything via Docker Compose: `docker compose up` (or `docker compose up api`
for just the backend). Compose bind-mounts source into the containers.

## Backend architecture (`apps/api`)

- `app/main.py` wires routers into the FastAPI app; each module gets its own
  router under `app/routers/` and is included there as it lands.
- Models/embeddings (`app/embeddings.py`, `app/detectors/models.py`) load
  **lazily on first request**, not at import/app-startup — `/health` and the
  rest of the API work before paying any model-download/load cost. This
  pattern is deliberate and should be followed for any new model-backed
  module (C, G).
- Downloaded models cache under `~/.cache/huggingface`. If a download hangs
  with files already present, retry with `HF_HUB_OFFLINE=1`.
- `apps/api/data/ledger.db` (SQLite) is gitignored — never commit a ledger
  database, and don't add a vector DB/ANN index for it; brute-force cosine
  over an in-memory load is the deliberate choice at this project's scale
  (see `docs/architecture.md` Module F section before changing this).
- `ruff` ignores `B008` project-wide — `Depends(...)` as a FastAPI default
  argument is idiomatic, not the mutable-default bug that check targets.
- Every endpoint is JSON except `/provenance/file` (Module D), which is a
  multipart file upload — don't assume `request()` in `apps/web/src/lib/api.ts`
  always sends a JSON body when adding a new client call.
- Prefer a real, maintained library over reimplementing a spec from scratch
  when correctness/security matters (Module D's C2PA verification uses the
  official `c2pa-python` SDK) — contrast with Module A, where reimplementing
  the watermarking papers directly *is* the point.

## Frontend architecture (`apps/web`)

- Each module gets its own route under `src/app/<module>/` (e.g. `watermark`,
  `watermark/robustness`, `ledger`, `detect`), generally a `page.tsx` plus a
  couple of colocated view components (`VerdictCard.tsx`, `TokenView.tsx`,
  etc.) and colocated `*.test.ts` files.
- `src/lib/api.ts` is the one place that talks to `apps/api` over the
  network — only modules that need server-side state (ledger, detect) touch
  it; watermarking runs fully client-side against `@provenance/watermark-core`.
- `apps/web/CLAUDE.md` / `apps/web/AGENTS.md`: this project uses a Next.js
  version recent enough that AGENTS.md is auto-regenerated by `next dev`
  with framework-specific instructions (breaking API changes from what
  training data expects). Read `node_modules/next/dist/docs/` for anything
  Next.js-specific before writing App Router code, and don't hand-edit that
  generated block out of the diff — commit it as `next dev` leaves it.

## `packages/watermark-core`

Pure TypeScript, no UI/runtime dependencies, built with `tsc` (not a bundler)
— runs identically in the browser and under vitest. `apps/web` imports its
built `dist/` output (via the `@provenance/watermark-core` workspace
dependency), so **run `npm run build:packages` after changing this package**
before the frontend will see the change (the root `typecheck`/`test`/`build`
scripts already do this for you).

Structure: `src/schemes/` (green-list, Gumbel — the two watermarking
algorithms), `src/hash.ts` (cyrb53 hash + mulberry32 PRNG — real algorithms,
not `Math.sin` tricks), `src/text.ts`/`src/vocab.ts` (toy POS-Markov-chain
text generator standing in for a real LM), `src/attacks.ts` (structural
perturbations for robustness testing), `src/analysis.ts` (sweep helpers used
by both the UI and `scripts/robustness-benchmark.mjs`), `src/stats.ts`
(z-test math). See `docs/architecture.md`'s "Module A" sections for why each
of these is built the way it is (toy grammar vs. real LM, repeated-n-gram
counting fix, distortion proxy in place of perplexity) — that context matters
before changing the statistics or the text generator.

## Cross-cutting conventions worth knowing before editing

- **Numbers in this project are measured, not guessed** — calibration
  thresholds (`AI_THRESHOLD`/`HUMAN_THRESHOLD` in `app/routers/detect.py`,
  `DEFAULT_SIMILARITY_THRESHOLD` in `app/ledger.py`) come from committed,
  reproducible scripts (`scripts/calibrate_binoculars.py`,
  `packages/watermark-core/scripts/robustness-benchmark.mjs`). If you change
  a threshold, update the script/data that justifies it, not just the
  constant.
- Simplifications that look naive are often deliberate and documented in
  `docs/architecture.md` / `docs/limitations.md` (toy grammar, regex sentence
  splitter, SQLite brute-force similarity, small model pair for Module B).
  Check there before "fixing" one.
- No copyrighted or scraped text is used as training/demo data anywhere;
  any third-party dataset must be documented (license + source) in
  `docs/dataset.md` and fetched by a setup script, never committed.
