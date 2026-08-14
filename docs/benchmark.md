# Benchmark

Status: stub — populated across Phases 2, 5, and 7 as each module produces
real evaluation numbers, then surfaced on the public `/benchmark` page in
Phase 9.

Planned contents:

- **Module A** (Phase 2): z-score vs. perturbation-strength curves; bias
  strength (δ) vs. text-quality tradeoff.
- **Module C** (Phase 5): accuracy, precision, recall, F1, ROC-AUC, and
  confusion matrix on a held-out split of the training dataset (see
  `docs/dataset.md`); conformal prediction coverage.
- **Module G / Attack Lab** (Phase 7): per-module accuracy-under-attack
  table across the standard attack suite, modeled on the PADBen
  methodology (Zha et al., 2025) — the project's headline statistic.

No numbers are published here or anywhere in this project until they come
from an actual run against real evaluation data — no hand-waved or
placeholder metrics.
