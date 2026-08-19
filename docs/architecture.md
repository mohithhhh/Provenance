# Architecture

Status: stub — filled in as modules land, with a diagram added in Phase 9.

## Monorepo layout

```
/apps/web                 — Next.js + TypeScript + Tailwind frontend (Vercel)
/apps/api                 — FastAPI backend for model-backed modules (B, C, F, G)
/packages/watermark-core  — Shared TS watermarking + z-test logic, no UI deps
/reference                — Original prototype, porting reference only
/docs                      — This directory
```

## Modules

| Module | Name                           | What it does                                                            | Where it lives                        |
| ------ | ------------------------------ | ----------------------------------------------------------------------- | ------------------------------------- |
| A      | Watermarking                   | Green-list/red-list + Gumbel generation, z-test detection               | `packages/watermark-core`, `apps/web` |
| B      | Zero-shot statistical detector | Binoculars-style cross-model perplexity, GLTR, burstiness, per-sentence | `apps/api`                            |
| C      | Trained classifier             | Stylometric features + logistic regression/GBM, conformal calibration   | `apps/api`                            |
| D      | File provenance (C2PA)         | C2PA manifest verification, EXIF surfacing                              | `apps/api`, `apps/web`                |
| E      | Ensemble dashboard             | Disagreement-aware combination, per-sentence heatmap, abstain state     | `apps/web`                            |
| F      | Retrieval provenance ledger    | Embedding-based nearest-neighbor lookup against this suite's own log    | `apps/api`                            |
| G      | Attack Lab                     | Paraphrase/adversarial attacks + live before/after across A/B/C/F       | `apps/api`, `apps/web`                |

Each module's design notes are added to this file as its phase lands.

## Module A: Watermarking (Phase 1)

Lives in `packages/watermark-core` (pure TypeScript, no UI/runtime
dependencies — runs identically in the browser and in tests) with a demo UI
at `apps/web/src/app/watermark`.

**Provenance note**: this was originally planned as a port of a prototype
at `reference/watermark-lab.html`. That file was never added to the repo,
so Phase 1 implements both schemes directly from their published papers
instead of porting anything.

### Two schemes, one shared toy grammar

Both schemes generate text with the same small, hand-written
part-of-speech Markov chain (`src/vocab.ts`, `src/text.ts`) — ~60 words
across 8 categories, with weighted category transitions. This is
deliberately not a real language model: real generative models are far too
heavy for a browser-only demo, and the watermark algorithms themselves are
model-agnostic, so a toy grammar is enough to demonstrate the actual
watermarking mechanics honestly. The toy grammar has no article/noun
agreement (e.g. "an tiny signal") and loops into short repetitive cycles —
both are true, visible limitations of the demo grammar, not the watermark
algorithm.

- **Green-list scheme** (`src/schemes/green-list.ts`) — Kirchenbauer,
  Geiping, Wen, Katz, Miers, Goldstein, _"A Watermark for Large Language
  Models"_ (2023). At each step, the vocabulary is split into a green list
  (fraction `gamma`) and red list, deterministically from a secret key and
  the previous token; green-list logits get a `+delta` boost before
  sampling. Detection runs a one-proportion z-test: how far the observed
  green-token rate is from the null rate `gamma`.
- **Gumbel scheme** (`src/schemes/gumbel.ts`) — the exponential-minimum-
  sampling / Gumbel-max approach from Aaronson & Kirchner's watermarking
  work and formalized in Kuditipudi, Thickstun, Hashimoto, Liang,
  _"Robust Distortion-free Watermarks for Language Models"_ (2023).
  Instead of biasing logits, it replaces the sampling step itself with a
  deterministic, key-seeded pseudorandom choice that looks like an
  ordinary sample to anyone without the key. Detection reconstructs the
  same pseudorandom values for the actual tokens used and z-tests their
  sum against its null distribution (Gamma(T, 1)).

### Hashing and randomness

`src/hash.ts` implements cyrb53 (a real, well-distributed 53-bit string
hash) and mulberry32 (a seeded PRNG), both public-domain algorithms
included for a stated reason: a `Math.sin(x) * 10000`-style trick is not a
real randomness source (it's smooth and low-entropy), and this project
uses real ones throughout, even in a toy demo.

### The repeated-n-gram fix

Both schemes' z-test assumes each scored token is an _independent_ draw.
That assumption breaks the moment a `(context, token)` pair repeats — the
green/red (or high/low-r) outcome for a given context is deterministic, so
counting the same pair twice double-counts one draw as if it were two
independent ones. With this project's small toy vocabulary, the grammar
chain falls into short repeating cycles quickly enough that this isn't a
theoretical edge case — an early version of this implementation's own
tests caught it inflating a wrong-key detection to a false "watermarked"
verdict. The fix, which mirrors the original green-list paper's own
documented handling of repeated n-grams, is to count only each distinct
`(context, token)` pair's first occurrence; repeats are still shown in the
UI (correctly colored) but excluded from the statistic. See
`src/types.ts`'s `DetectedToken.counted` and the "only counts each
repeated pair once" tests in both scheme test files.

### What Phase 1 does not cover

Robustness to paraphrasing/editing and the quality-vs-`delta` tradeoff are
Phase 2's job, not this one — nothing here has been tested against attacks
yet. See `docs/limitations.md`.
