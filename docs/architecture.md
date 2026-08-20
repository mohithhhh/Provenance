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

## Module A: Robustness + tradeoff analysis (Phase 2)

Adds `src/attacks.ts` (four structural perturbations — substitute/delete/
insert/reorder, each a `strength: 0..1` fraction of words affected) and
`src/analysis.ts` (sweep helpers: run an attack at increasing strength and
re-detect, or generate at increasing δ and self-detect) to
`packages/watermark-core`, a new `/watermark/robustness` UI page with two
SVG line charts, and real numbers in `docs/benchmark.md` — generated by
`packages/watermark-core/scripts/robustness-benchmark.mjs`, a small
Node script built on the exact same exported sweep functions the UI uses
(not a separate reimplementation), run with 30 seeded PRNG runs so the
published numbers are exactly reproducible rather than a one-off
screenshot.

**These attacks are explicitly not real paraphrasing.** They're simple,
structural, and grammar-blind — a same-category word swap, plain deletion,
grammar-blind insertion, local adjacent-pair shuffling. A real paraphrase
attack (an actual model rewriting the text's meaning) is Module G's job
(Phase 7) and is expected to be considerably more damaging than any of
these four; see `docs/limitations.md`. The point of this phase is narrower:
show _some_ quantified degradation curve and _some_ quantified quality-cost
proxy, honestly, rather than nothing.

**The distortion proxy.** The original green-list paper measures the
δ/quality tradeoff against a real language model's perplexity. This toy
grammar has no perplexity to measure — there's no real fluency signal to
lose. Standing in for it: the achieved green-token fraction (how far above
γ it sits), which is a direct measure of how hard the bias pushed sampling
away from what an unwatermarked draw would have produced. It's a real,
computed quantity, not fabricated — but it is a structural proxy, not a
quality metric, and is documented as such everywhere it's shown.

See `docs/benchmark.md` for the actual numbers and how to reproduce them.

## Module F: Retrieval provenance ledger (Phase 3)

Lives in `apps/api` (`app/embeddings.py`, `app/ledger.py`,
`app/routers/ledger.py`) with a UI at `apps/web/src/app/ledger`. Unlike
Module A, this needs a real, persistent, server-side store — a browser tab
can't be the ledger — so this is the first part of the app where the
frontend makes a genuine network call to the backend (`apps/web/src/lib/api.ts`).

**What it does**: logs arbitrary text (with an embedding) into a SQLite
database; later, given a candidate text, embeds it and finds the
nearest-neighbor logged entry by cosine similarity. Because embedding
similarity captures meaning rather than exact wording, this survives
paraphrasing far better than exact-match or the statistical/classifier
methods Modules B and C will use — that's the entire point, and the
literature basis for it (Krishna, Song, Karpinska, Wieting, Iyyer,
"Paraphrasing evades detectors of AI-generated text, but retrieval is an
effective defense", NeurIPS 2023).

**The one thing this can never do**: recognize text it was never told
about. It's not a general AI-content detector — see `docs/limitations.md`.

### Embeddings: fastembed (ONNX), not sentence-transformers (PyTorch)

Both give real semantic embeddings; the difference is footprint.
sentence-transformers pulls in PyTorch, which on this project's own dev
machine meant risking the same disk-space crunch Phase 0 already hit once.
fastembed runs the same class of model (`BAAI/bge-small-en-v1.5`, 384
dims) via ONNX Runtime — measured here at ~165MB of installed dependencies
versus PyTorch's typical several-hundred-MB-to-1GB+ footprint. This is a
disk-conscious engineering tradeoff specific to this project's constraints,
not a claim that ONNX embeddings are categorically better.

The model loads lazily (first ledger call, not app startup) and is cached
under `~/.cache/huggingface` after the first download (~130MB, needs
network access once per machine — see `apps/api/README.md`).

### Similarity threshold: empirically chosen, not guessed

`DEFAULT_SIMILARITY_THRESHOLD = 0.85` in `app/ledger.py` is based on this
measured table (`BAAI/bge-small-en-v1.5`, cosine similarity):

| Pair                                          | Similarity |
| --------------------------------------------- | ---------- |
| Exact copy                                    | 1.000      |
| Light paraphrase (reordered clause)           | 0.994      |
| Heavy paraphrase (reworded, same claim)       | 0.937      |
| Same topic, **different/contradictory claim** | 0.738      |
| Unrelated text                                | 0.358      |

0.85 sits cleanly between "genuine paraphrase" (0.92–1.0) and "merely
on-topic but not the same content" (0.74) — which is also this scheme's
most important **honest limitation**: a text asserting the opposite of
something logged ("the committee _rejected_ the budget" vs. "..._approved_
the budget") scores 0.738, not near-zero. Pure semantic similarity conflates
_topic_ with _content_ to some degree; it cannot verify factual identity,
only rough semantic proximity. This is a real, inherent property of
embedding-based retrieval, not a bug to fix later.

### Storage: SQLite + brute-force cosine similarity

No vector database, no ANN index (FAISS/HNSW/pgvector) — a deliberate
simplification appropriate at demo scale (hundreds to low-thousands of
rows): `find_nearest` loads every stored embedding into memory and scores
them all. A production system at real scale would need an ANN index; this
one doesn't, and adding one now would be complexity this project doesn't
need yet. `apps/api/data/ledger.db` is gitignored — nobody's ledger is
committed to source control.

## Module B: Zero-shot statistical detector (Phase 4)

Lives in `apps/api` (`app/detectors/models.py`, `app/detectors/perplexity.py`,
`app/routers/detect.py`), UI at `apps/web/src/app/detect`. The first module
in this project that needs an actual generative language model, not just
embeddings — there's no lightweight substitute for measuring how
"surprised" a language model is by a text.

### Two small, same-family models: gpt2 (performer) + distilgpt2 (observer)

`torch` + `transformers`, loaded lazily like Module F's embedding model.
Chosen deliberately small (124M / 82M params) — real LM-based detection
methods normally use much larger models, but this project needs something
that downloads and runs on a laptop CPU in well under a second per request
once warm (measured: ~50ms/request after the one-time model load). gpt2
and distilgpt2 share a tokenizer/vocabulary (distilgpt2 is literally
distilled from gpt2), which the cross-perplexity method below requires.

### Three signals, one pass over both models

- **Binoculars-style cross-perplexity** — an independent implementation of
  the general approach in Hans, Schwarzschild, Cherepanova, Kazemi, Saha,
  Goldblum, Geiping, Goldstein, _"Binoculars: Zero-Shot Detection of
  LLM-Generated Text"_ (2024). The paper pairs two ~7B models and
  calibrates a threshold (0.9015) on a large corpus; this project's much
  smaller model pair needed its own calibration (below) — the paper's
  threshold doesn't transfer to a completely different model pair and
  scale. `binocularsScore = perplexity(text) / crossPerplexity(text)`,
  where cross-perplexity is the exponentiated mean cross-entropy between
  the two models' next-token distributions at each position, both
  conditioned on the same real prefix. Lower score → more machine-like.
- **GLTR-style rank buckets** — Gehrmann, Strobelt, Rush, _"GLTR:
  Statistical Detection and Visualization of Generated Text"_ (2019): the
  rank of each actual token within the performer model's own predicted
  ranking (0 = the model's top pick), bucketed into top-10/top-100/
  top-1000/rest and rendered as a heatmap.
- **Burstiness** — `(σ - μ) / (σ + μ)` over per-sentence mean surprisal;
  also from the GLTR line of work. Shown as a supporting statistic, not a
  standalone verdict.

### Threshold calibration: measured, not guessed

`scripts/calibrate_binoculars.py` (committed, reproducible) scores 8
original human-authored sentences (written for this project — not scraped
from any corpus) against 8 sentences gpt2 generated from itself (seed 0,
so exactly reproducible) — the cleanest possible source of "genuinely
machine-generated text," no licensing question at all:

|                     | min   | max   |
| ------------------- | ----- | ----- |
| AI (gpt2-generated) | 0.093 | 0.225 |
| Human (original)    | 0.294 | 0.725 |

Clean separation, gap `[0.225, 0.294]`. `AI_THRESHOLD = 0.24`,
`HUMAN_THRESHOLD = 0.28` in `app/routers/detect.py`, leaving a narrow
"uncertain" band between them. This is a small, illustrative calibration
set (16 samples) — not a statistically powered benchmark. That rigor is
Module C's Phase 5 job, using the HC3 dataset.

### Two honest caveats found while building this, not swept under the rug

- **Famous/memorized phrases can look anomalously predictable.** An early
  manual test scored "The quick brown fox jumps over the lazy dog" — it
  landed comfortably in the human range (0.41; the pangram's fame didn't
  break the method here), but the risk is real and worth stating plainly:
  a small LM's perplexity reflects what it memorized during pretraining as
  much as what's "natural," so a human quoting a famous line or cliché
  can score differently than the same person's original prose. This
  method measures predictability-to-this-specific-model, not humanness.
- **This shares the base-model blind spot documented in
  `docs/limitations.md`.** Recent research finds that text from
  non-instruction-tuned base models tends to evade exactly this class of
  statistical detector — Module B has not been tested against that case
  specifically, and is expected to share the weakness rather than being
  immune to it.

### Sentence splitting

`split_sentences()` is a regex splitter on `.!?` boundaries, not a real
sentence tokenizer — it mis-splits on abbreviations ("Dr. Smith"), the
same category of honest simplification as Module A's toy `tokenize()`.
