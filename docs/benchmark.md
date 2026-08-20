# Benchmark

Numbers below are populated as each module produces them, then surfaced on
the public `/benchmark` page in Phase 9. No numbers are published here or
anywhere in this project until they come from an actual run against real
evaluation data — no hand-waved or placeholder metrics.

Planned:

- **Module C** (Phase 5): accuracy, precision, recall, F1, ROC-AUC, and
  confusion matrix on a held-out split of the training dataset (see
  `docs/dataset.md`); conformal prediction coverage.
- **Module G / Attack Lab** (Phase 7): per-module accuracy-under-attack
  table across the standard attack suite, modeled on the PADBen
  methodology (Zha et al., 2025) — the project's headline statistic.

## Module A: Watermarking (Phase 2)

**Reproduce**: `npm run build --workspace=packages/watermark-core && node packages/watermark-core/scripts/robustness-benchmark.mjs`.
Every run uses a seeded PRNG (mulberry32, seeds 1–30), so these are exactly
reproducible, not a one-off screenshot. Green-list scheme, key
`"benchmark-key"`, γ=0.5, δ=2 (for the robustness table), length=150 words,
detection threshold z > 4 — same defaults used elsewhere in this project.
Attacks are this project's own simplified structural perturbations (see
`docs/architecture.md` and `packages/watermark-core/src/attacks.ts`), **not**
real paraphrasing — see the caveat below.

### Robustness — mean z-score over 30 seeded runs, by attack strength

| Attack     | 0%   | 10%  | 20%  | 30%  | 40%  | 50%  | 75%  | 100% |
| ---------- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| substitute | 6.80 | 5.44 | 4.10 | 3.18 | 2.26 | 1.62 | 1.09 | 0.45 |
| delete     | 6.80 | 5.80 | 4.80 | 4.35 | 3.54 | 2.73 | 1.17 | 0.00 |
| insert     | 6.80 | 6.01 | 5.22 | 4.55 | 4.04 | 3.97 | 3.03 | 2.50 |
| reorder    | 6.80 | 5.23 | 4.07 | 3.54 | 3.32 | 2.82 | 2.06 | 2.02 |

### Fraction of 30 runs still flagged "watermarked" at each strength

| Attack     | 0%   | 10%  | 20%  | 30% | 40% | 50% | 75% | 100% |
| ---------- | ---- | ---- | ---- | --- | --- | --- | --- | ---- |
| substitute | 100% | 100% | 57%  | 20% | 0%  | 0%  | 0%  | 0%   |
| delete     | 100% | 100% | 87%  | 63% | 40% | 7%  | 0%  | 0%   |
| insert     | 100% | 100% | 100% | 77% | 60% | 57% | 10% | 3%   |
| reorder    | 100% | 97%  | 57%  | 30% | 27% | 17% | 0%  | 0%   |

**Reading this honestly**: word substitution is the most damaging attack in
this toy setting — detection is essentially gone by 30–40% of words
replaced. Insertion is the weakest, staying >50% detected even at 50%
strength, because inserting new words dilutes the green-token rate without
flipping any already-placed token's own green/red status. This ordering is
specific to this small toy vocabulary and grammar; it is not a claim about
how real green-list watermarks respond to real edits, and none of this
should be read as robustness to actual paraphrasing — a real paraphrase
model (Module G, Phase 7) rewrites _meaning_, not just word identity, and is
expected to be substantially more damaging than any of these four attacks.

### δ tradeoff — mean over 30 seeded runs

| δ   | mean z-score | mean green fraction |
| --- | ------------ | ------------------- |
| 0   | 0.61         | 52.8%               |
| 1   | 4.09         | 68.5%               |
| 2   | 6.63         | 80.3%               |
| 3   | 8.20         | 87.5%               |
| 4   | 8.78         | 90.4%               |
| 5   | 9.04         | 91.6%               |
| 6   | 9.16         | 92.1%               |
| 8   | 9.19         | 92.4%               |

δ=0 (no bias) sits right at the null expectation (green fraction ≈ γ=0.5,
z≈0), which is the sanity check this whole scheme rests on. δ=1 already
crosses the z>4 detection threshold on average; returns clearly diminish
past δ≈4 (green fraction plateaus around 90–92%, since it's bounded below
100%). Green fraction is used here as the distortion proxy in place of real
perplexity/fluency — this toy grammar has no model to measure true text
quality against, which is a real limitation, not a shortcut; see
`docs/architecture.md`.

## Module B: Zero-shot statistical detector (Phase 4)

**Reproduce**: `cd apps/api && python scripts/calibrate_binoculars.py`
(venv active). AI samples are generated live by gpt2 itself with a fixed
seed (0); human samples are original sentences written for this project —
see `docs/architecture.md` for why (no scraped/copyrighted text, and no
risk of the small model having memorized them).

### Binoculars score by sample (gpt2 performer / distilgpt2 observer)

|                             | min   | max   |
| --------------------------- | ----- | ----- |
| AI (gpt2-generated, seed=0) | 0.093 | 0.225 |
| Human (original)            | 0.294 | 0.725 |

Clean separation on this small calibration set (8 samples each): gap
`[0.225, 0.294]`. `AI_THRESHOLD = 0.24` / `HUMAN_THRESHOLD = 0.28` in
`apps/api/app/routers/detect.py` sit inside that gap. This is a small,
illustrative calibration, not a statistically powered benchmark — that's
what Module C's Phase 5 HC3-based evaluation is for, and Module B's
numbers should be read with that scale in mind.
