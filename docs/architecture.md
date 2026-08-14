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
