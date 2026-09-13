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
`HUMAN_THRESHOLD = 0.28` in `app/detectors/perplexity.py`, leaving a narrow
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

### Addendum (Phase 7): a real concurrency bug, found by the Attack Lab

Module G's Attack Lab calls `/detect/statistical` on the original and
attacked text **concurrently** (`Promise.all` on the frontend). FastAPI
runs sync route handlers in a thread pool, so two requests could invoke
the shared, lazily-loaded gpt2/distilgpt2 singletons (`app/detectors/
models.py`) at the same time — and PyTorch modules aren't guaranteed
thread-safe for concurrent `forward()` calls on the same instance.
Reproduced directly: 8 concurrent calls on identical input returned an
identical, garbled perplexity (~50257 — suspiciously exactly gpt2's vocab
size) instead of each computing the correct value independently,
occasionally extreme enough to overflow `math.exp()` outright and crash
the request. Not a rare edge case — reproduced reliably every time it was
tried, with no lock.

Fixed with a single lock (`_MODEL_LOCK` in `perplexity.py`) serializing
the two model forward passes — a small model pair on a laptop CPU has no
real throughput to lose from this, the same reasoning as Module F's
brute-force cosine search. `_safe_exp()` was added alongside it as
defense in depth: `math.exp` raises `OverflowError` past ~709 rather than
returning `inf`, and infinite perplexity is a legitimate, meaningful value
("unboundedly surprising to this model"), not something worth crashing
the request over. See `tests/test_perplexity_concurrency.py` (a
best-effort, timing-dependent regression test — it reliably reproduced
the bug during development, but a race isn't guaranteed to reproduce on
every machine) and `tests/test_perplexity.py::TestSafeExp`.

## Module C: Trained classifier (Phase 5)

Lives in `apps/api` (`app/classifier/features.py`, `app/classifier/model.py`,
`app/classifier/dataset.py`, `app/routers/classify.py`), UI at
`apps/web/src/app/classify`. Where Module B is zero-shot (no training,
just how surprising two off-the-shelf LMs find the text), Module C is a
small **trained** classifier — logistic regression over stylometric
features, fit on real labeled data (HC3, see `docs/dataset.md`) with a
real held-out evaluation.

### Stylometry, not a language model

`features.py` extracts ~19 classic stylometric features (sentence-length
mean/stdev, average word length, type-token ratio, punctuation ratios,
contraction rate, and the frequency of 10 common function words) with
plain `re`/`statistics` — no NLP dependency, and none of Module B's LM
inference cost. Logistic regression was chosen over a GBM (both were on
the table) because with a feature set this small and hand-picked,
interpretability (a signed coefficient per feature) matters more than the
marginal accuracy a GBM might add, and the feature-importance view in the
UI depends on that interpretability directly.

### Calibration: split conformal prediction, not a bare percentage

Rather than reporting `predict_proba()`'s output as-is — a classic
over-confident-black-box move — `model.py` wraps it in **split conformal
prediction** (Vovk, Gammerman, Shafer, _"Algorithmic Learning in a Random
World"_, 2005): a third, held-out calibration split (never used for
training or evaluation) produces nonconformity scores (`|y - p_hat|`),
and the `ceil((n+1)(1-alpha))/n` empirical quantile of those scores becomes
a fixed half-width added/subtracted around every future prediction. This
gives the interval a **marginal coverage guarantee** — over many
predictions, the true label falls inside the reported interval at least
`(1-alpha)` of the time, assuming the calibration and future data are
exchangeable — instead of an uncalibrated single number. See
`docs/limitations.md` for what "marginal" and "exchangeable" don't
promise (not per-example, and can drift on text far outside HC3's
distribution).

### Measured, not guessed

`scripts/train_classifier.py` (reproducible, committed) trains on real
HC3 data and prints real numbers — held-out accuracy/precision/recall/F1/
ROC-AUC/confusion matrix, the calibration quantile, and the **measured**
test-set coverage (not just the theoretical target) — see
`docs/benchmark.md` for the actual run. The trained artifact
(`app/classifier/artifact/model.json`) is a small, human-readable JSON of
the standardization + logistic-regression parameters, not a pickle — no
arbitrary-code-execution surface from loading it, and it's committed
directly (the dataset it's trained from is not — see `docs/dataset.md`).

### What Phase 5 does not cover

Feature importance shown in the UI is the model's own (global,
standardized) coefficients times each request's own (scaled) feature
values — a real, direct decomposition of the logit, not a separate
post-hoc explainability method (e.g. SHAP). This shares Module B's base-
model-adjacent blind spot: a classifier trained on stylometric surface
features is expected to degrade against text specifically optimized to
evade stylometric detection (Module G's job, Phase 7) — see
`docs/limitations.md`.

### Addendum (Phase 7): a real bug in the original verdict logic

Building Module G's benchmark script surfaced a bug in Phase 5's shipped
`/classify` verdict: it originally decided "likely-ai"/"likely-human" by
checking whether the **conformal interval** excluded 0.5. That sounds more
rigorous than a plain threshold, but at this classifier's measured
quantile (~0.70 — see `docs/benchmark.md`), `interval_low = p - 0.70` and
`interval_high = p + 0.70` straddle 0.5 for **every** probability `p` in
`[0, 1]` — so that logic could never return anything but `"uncertain"`,
for any input at all, attacked or not. No test had ever asserted a
confident verdict was reachable, so it shipped unnoticed. Fixed in
`verdict_from_probability()` (`app/classifier/model.py`): the verdict now
comes from the point probability estimate directly (a small ±0.1 band
around 0.5 counts as uncertain), and the conformal interval is still
computed and returned — honestly, as a calibrated confidence range — it
just no longer doubles as the classification rule. See
`tests/test_classifier_model.py::TestVerdictFromProbability` for the
regression tests.

## Module D: File provenance / C2PA (Phase 6)

Lives in `apps/api` (`app/provenance/c2pa.py`, `app/provenance/exif.py`,
`app/routers/provenance.py`), UI at `apps/web/src/app/provenance`. This is
the one module in this suite that is not statistical inference at all —
it's **cryptographic verification of an attached, signed claim**, and the
UI keeps that distinction visible ("cryptographically verified" vs. every
other module's "statistically inferred").

### C2PA: real verification via the official SDK, not a reimplementation

Unlike Module A's watermarking schemes (deliberately reimplemented from
their papers), C2PA manifest verification is **not** reimplemented here —
`c2pa-python` (official Python bindings to Adobe/CAI's `c2pa-rs`) does the
actual cryptographic work: parsing the embedded JUMBF manifest, checking
the claim signature and timestamp, and re-hashing the asset to detect
tampering. Reimplementing manifest parsing and signature verification from
scratch would be a large, security-sensitive undertaking with no benefit
over the SDK the C2PA spec's own authors publish — the honest, lazy choice
here is to trust the real implementation, the same way this project trusts
`torch`/`transformers` for language models rather than writing a
transformer from scratch.

`verify()` (`app/provenance/c2pa.py`) maps the SDK's output to one of four
states:

- **`valid`** — a manifest is present and `validation_state == "Valid"`:
  the claim signature and content hash both check out.
- **`invalid`** — a manifest is present but validation failed (most often
  `assertion.dataHash.mismatch`: the asset's bytes were altered after
  signing).
- **`no-manifest`** — no C2PA data at all (`C2paError.ManifestNotFound`).
  This is the common case for arbitrary uploads and is not itself a red
  flag — it just means there's no signed claim to check.
- **`unsupported`** — the SDK couldn't parse the asset as any recognized
  format.

**A real, surprising subtlety found while building this**: even a
pristine, validly-signed test image reports a `signingCredential.untrusted`
entry in `validation_results`, because the sample fixtures (see
`tests/fixtures/c2pa/README.md`) are signed with C2PA's own _test_ signing
certificate, which isn't in the SDK's default trust store — yet
`validation_state` still comes back `"Valid"`, because that state tracks
hash/timestamp integrity, not real-world CA trust. `C2paResult.failures`
can therefore be non-empty on an otherwise-valid result; the UI shows
these as "validation notes" alongside (not instead of) the overall status,
rather than collapsing everything into a single boolean.

### EXIF: unsigned, shown as context only

`app/provenance/exif.py` uses Pillow (`Image.getexif()`) — the standard,
well-maintained way to read EXIF in Python; there's no stdlib equivalent.
EXIF is ordinary, unsigned file metadata that any image editor can
rewrite freely, so it's surfaced as raw context next to the C2PA result,
never merged into or treated as part of the provenance verdict.

### Scope: images only, capped at 20MB

Only `image/jpeg`, `image/png`, and `image/webp` are accepted — not PDFs,
despite the original phase plan mentioning both. C2PA manifests in PDFs
use a different embedding mechanism than image formats, and EXIF doesn't
apply to PDFs at all; supporting them would roughly double this phase's
scope for a demo that already has three working image-based modules. A
deliberate, documented scope cut, not an oversight — see
`docs/limitations.md`.

## Module G: Attack Lab (Phase 7)

Lives in `apps/api` (`app/attacks/attacks.py`, `app/attacks/paraphrase.py`,
`app/routers/attacks.py`), UI at `apps/web/src/app/attack-lab`. The
headline feature: apply one attack to a piece of text, then run it through
Modules A, B, C, and F simultaneously and show the before/after — proof
instead of a marketing claim, and the whole reason Module F exists in this
suite at all (see its own section above).

### Four attacks, three structural + one real

`attacks.py` implements three deliberately simple, structural
perturbations — **synonym substitution** (a small, hand-picked ~50-word
dictionary; not real WordNet-scale coverage, the same honest-simplification
spirit as Module A's toy grammar), **sentence reordering** (a partial
Fisher-Yates shuffle over a `strength` fraction of sentences, mirroring
`reorderAttack` in `packages/watermark-core/src/attacks.ts`), and
**truncation** (keep the first `(1 - strength)` fraction of words). The
fourth, **paraphrase** (`paraphrase.py`), is real: an actual small T5 model
rewriting meaning, not a word/sentence shuffle. Paraphrasing in general is
the attack that defeats most published detectors (the same point Module
F's own docs make) — but measured here, this specific small checkpoint
turned out to be the _least_ damaging of the four; see "A real discovery"
below for why that's a property of the model, not evidence against the
general claim.

### The paraphrase attack needed a disk-space call, made with the user

`mrm8488/t5-small-finetuned-quora-for-paraphrasing` (T5-small) was picked
as the smallest known real fine-tuned paraphrase checkpoint on Hugging
Face, specifically because this phase was first built while the dev
machine had **~178MB free disk** — not enough for even the smallest
reasonable option (measured at ~440MB once actually downloaded — a bare
T5-small's parameter count would suggest less, but this checkpoint stores
an untied `lm_head` alongside the shared embedding table). Asked directly,
the initial call was: ship the three structural attacks fully now, and
make the paraphrase attack's _unavailability_ a first-class, well-tested
state rather than skip it silently or attempt a download that would fail.
`ParaphraserUnavailable` (`paraphrase.py`) wraps any load failure
(`OSError` — no space, or no network) into a clear message; the router
turns that into a 503; the UI surfaces it inline rather than crashing.

Disk freed up later in the same session, and the model was downloaded for
real (also needing `sentencepiece`, added to `requirements.txt` — T5's
tokenizer is SentencePiece-based, and its absence surfaced as a confusing
tiktoken-related error rather than a clear message, since Hugging Face
falls back to a tiktoken loader that can't read a SentencePiece file
either). It's now a real, tested attack — `tests/test_paraphrase.py`'s
`TestParaphraseRealModel` exercises it directly, same "use the real thing,
no fake would test anything meaningful" reasoning as Module B. Trained
specifically on Quora question-pairs, it makes small, conservative edits
on declarative sentences and does its most substantive rewriting on
question-shaped input — a real, measured property of this specific
checkpoint, not a flaw in the attack's implementation.

### Why the benchmark script doesn't include Module A

`scripts/attack_lab_benchmark.py` measures accuracy-under-attack for
Modules B, C, and F, across all four attack types (paraphrase run once,
with no strength dial — see the script's own docstring for why). Module A
(watermarking) already has its own real robustness benchmark against its
own native structural attacks (Phase 2, `docs/benchmark.md`) — it's
TypeScript-only (`packages/watermark-core`), so including it here would
mean either shelling out to Node from a Python script or reimplementing
the same attacks a second time in Python, for a result Phase 2 already
reports honestly. The interactive Attack Lab UI is where a live A/B/C/F
comparison actually happens, for a single sample the user picks.

### A real discovery from running it: Module C doesn't generalize past HC3

The benchmark's baseline row (no attack at all) turned up something more
fundamental than attack robustness: Module C gets **7/16 (44%)** on this
test set even before any attack — worse than a coin flip — while Module B
gets 16/16. The cause isn't the attacks; it's a domain mismatch. Module C
was trained on HC3 (long-form Q&A: finance/medicine/reddit_eli5/etc.,
human vs. ChatGPT). This benchmark's samples are short personal-narrative
sentences (human) and raw gpt2 autocomplete continuations (AI) — a
different register and a different generator than ChatGPT entirely.
Module C's stylometric features learned real signal _for HC3's specific
distribution_, and that signal doesn't transfer to a different generator
or genre. This is a genuine, previously-undocumented limitation, not an
attack finding — see `docs/limitations.md`, and see
`docs/architecture.md`'s Module C section for a second, related bug this
same benchmark run surfaced (the verdict logic itself was broken).

### A second real discovery: paraphrase was the _weakest_ attack, not the strongest

Once disk space allowed the T5 paraphrase model to actually run (see
above), the benchmark's full table (`docs/benchmark.md`) showed something
that directly contradicts this project's own stated expectation going in:
B stayed at 16/16, C went _up_ to 9/16 from its 7/16 baseline, F stayed at
16/16 — paraphrase moved nothing, while the "weaker" structural attacks
(especially truncation) did real damage to F. Manually inspecting this
checkpoint's output explains it: `mrm8488/t5-small-finetuned-quora-for-
paraphrasing` was fine-tuned specifically on Quora question-pairs, and on
this benchmark's declarative, narrative-style sentences it frequently
returns the input nearly (sometimes exactly) unchanged rather than a real
rewrite. That's a property of this one small, deliberately disk-conscious
checkpoint (picked for its size — see above), not a refutation of the
published result this whole module cites (Krishna et al., 2023 used a
full general-purpose paraphraser). Reported honestly rather than tuned
away or left for the reader to notice — see `docs/benchmark.md` for the
full reading.

## Module E: Ensemble dashboard (Phase 8)

Lives entirely in `apps/web` (`src/lib/ensemble.ts`, UI at
`src/app/ensemble`) — no new backend endpoint. One input triggers Modules
B, C, and F (already-built endpoints, called directly from the client,
the same pattern the Attack Lab established in Phase 7), and every
module's own result is always shown as-is, never blended away, alongside
one combined estimate. Modules A and D are deliberately excluded: A needs
a known watermark key (arbitrary pasted text has no watermark to find, the
same reasoning the Attack Lab applies), and D is **cryptographic**
verification of an attached signed claim, not a statistical estimate —
mixing "verified" and "inferred" into one number would be exactly the
kind of false precision this whole project argues against (see Module D's
own "cryptographically verified" vs. "statistically inferred" framing).

### The combination: inverse-variance weighting, not an invented formula

`ensemble.ts` combines Module B and C's independent AI-probability
estimates via **inverse-variance weighting** — the standard fixed-effect
meta-analysis technique (see the Cochrane Handbook for Systematic
Reviews): each estimate is weighted by `1/variance`, so a more confident
(lower-variance) estimate pulls the combined result toward it more than a
less confident one, and the combined variance is `1/Σ(1/varianceᵢ)`. This
was picked over inventing an arbitrary weighted average specifically
because it's a real, citable statistical method, not because it's the
only reasonable choice.

The two modules' variances are not equally real:

- **Module C already has one** — its split conformal interval
  (`docs/architecture.md`'s Module C section) is a genuine, calibrated
  quantity. `classifierToEstimate()` converts it to a variance via the
  standard CI-to-SE conversion (`half-width / z`), the same step used to
  pool studies reported as confidence intervals in a real meta-analysis.
- **Module B has no native per-instance interval.** `binocularsToEstimate()`
  constructs an honestly-labeled _heuristic_ instead: a logistic mapping of
  the raw score onto Module B's own uncertain band (scored so the band's
  midpoint is 50/50 and the calibration data's real range, ~0.09-0.73,
  spans close to 0%-100%), with variance shrinking as the score moves
  further from that midpoint. This is a real per-instance signal (it does
  vary with the actual score, unlike a fixed constant) but it is a
  construction, not a fitted statistical quantity — documented as such in
  the code, and contrasted directly against Module C's real interval so
  the difference in rigor isn't hidden.

### Disagreement overrides the math

A combined score computed from two active disagreements is exactly the
false-precision problem this project exists to avoid, so
`computeEnsemble()` checks the two modules' own three-way verdicts first:
if one says `likely-ai` and the other says `likely-human`, the result is
reported as `disagreement` outright — the weighted average is still
computed and shown (for transparency), but the verdict badge reads
"Modules disagree — abstaining" rather than a confident-looking number.
This is the literal "abstain state when signals are ... contradictory"
the phase plan asked for, implemented as a simple rule over two verdicts
that already exist, not a new fuzzy confidence threshold.

### The per-sentence heatmap reuses Module B's own data — it is not a trained segmentation model

Real per-segment classification of mixed human/AI documents is its own
line of research and its own model, trained specifically for that task —
out of scope here. `SentenceHeatmap.tsx` instead repurposes data Module B
_already computes_: each sentence's top-10-token fraction
(`app/detectors/perplexity.py`'s GLTR-style signal), rendered as a
continuous blue color wash (one hue, intensity only — the "sequential"
color job for encoding magnitude, per this project's data-viz convention;
the exact hue is the validated default sequential blue, applied as a
continuous alpha channel rather than discrete steps so one hue works on
both light and dark surfaces without a second hardcoded ramp). This is a
real, honest visual proxy for "which spans look more predictable to
Module B" — not a claim of trained per-segment AI/human classification.

### What Phase 8 does not cover

Module C has no per-sentence output (`app/routers/classify.py` scores the
whole document's stylometric features at once), so the heatmap uses only
Module B's data — extending Module C to per-sentence scoring was
explicitly framed as optional ("if extended") in the phase plan and was
left out here rather than adding a second, less-grounded heatmap signal
for a proportionally small gain. Module F's check runs read-only (no
`ledger/log` call) so opening this dashboard never writes to the shared
ledger — a real consequence worth knowing: unlike the Attack Lab, this
page will essentially always report "no match" here for fresh text unless
it happens to already be logged.

## Phase 9: Batch mode, benchmark page, deploy

**Batch mode** (`apps/web/src/app/batch`) is Module E's per-text analysis
run over many lines of input, sequentially (not concurrently — the same
model-contention reasoning as `_MODEL_LOCK` in Module B applies at the
batch level too: there's no real throughput to gain from firing many CPU-
bound model calls at once on a laptop-scale deployment, and it avoids
hammering an already-serialized backend). `apps/web/src/lib/csv.ts` splits
input on newlines only — deliberately not a full RFC 4180 parser, since
each line is one whole text with no field-delimiter ambiguity to resolve —
but does produce properly quoted/escaped CSV on export, where result rows
sit in genuine columns next to arbitrary user text that may contain commas
or quotes.

**The benchmark page** (`apps/web/src/app/benchmark`) republishes real
numbers that already exist in `docs/benchmark.md` — no new computation, a
presentational port of the headline tables (Attack Lab accuracy-under-
attack, Module C's evaluation, Module B's calibration, Module A's
robustness) for a reader who wants the numbers without cloning the repo.

**Deploy**: `apps/web` builds as a static export (`output: 'export'` in
`next.config.ts` — verified: every route here is client-rendered against
`apps/api`, no Next.js API routes or server actions, so `npm run build`
produces a real `apps/web/out/` directly usable by Cloudflare Pages, no
adapter needed) to Cloudflare Pages; `apps/api` deploys to Render via the
root `render.yaml` Blueprint, deployed on Render's **free** tier — a
deliberate cost-over-robustness choice. Full steps and consequences in
`docs/deploy.md`: Render's filesystem is ephemeral and the free tier spins
down after 15 minutes idle (wiping it on every spin-down, not just on
redeploy), so a cold visit re-downloads every lazily-loaded model from
scratch; and this project's own process measured ~650-700MB RSS with
Modules B, C, and G's paraphraser loaded — over free tier's 512MB, so the
service can OOM-restart if a visitor uses more than one heavy module in
one session. `render.yaml` documents the upgrade path (`plan: standard`)
inline for exactly this reason.
