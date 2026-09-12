# apps/api

FastAPI backend for Provenance. Hosts the modules that need a real language
model, embeddings, or scikit-learn (Modules B, C, F, G — added across
phases).

## Local setup (without Docker)

Pinned to **Python 3.11** rather than the system's newest Python: ML
libraries used from Phase 4 onward (`torch`, `transformers`) typically ship
wheels for 3.11/3.12 well before brand-new Python releases, so 3.11 is the
safer default for this project even though newer interpreters may be
installed on your machine.

```bash
cd apps/api
python3.11 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload    # http://localhost:8000
```

## Tests / lint / typecheck

```bash
pytest
ruff check .
mypy .
```

## Via Docker Compose

From the repo root: `docker compose up api`.

## Module F (retrieval ledger) notes

Uses [fastembed](https://github.com/qdrant/fastembed) (ONNX Runtime) for
embeddings rather than sentence-transformers/PyTorch — same real semantic
embedding quality, much smaller install (see `docs/architecture.md`). The
embedding model (`BAAI/bge-small-en-v1.5`, ~130MB) downloads on first use,
not at import/startup time, so `/health` and the rest of the API work even
before that first ledger call — but the first `/ledger/log` or
`/ledger/check` on a fresh machine needs network access. After that it's
cached under `~/.cache/huggingface` and loads in well under a second.

Ledger data lives in `apps/api/data/ledger.db` (SQLite, gitignored — never
committed).

## Module B (statistical detector) notes

Uses real `gpt2` (~525MB) and `distilgpt2` (~260MB) models via
`transformers`/`torch` — no lightweight substitute exists for this one.
Same lazy-load pattern as Module F: `/health` and startup don't pay the
cost, only the first `/detect/statistical` call does. Cached under
`~/.cache/huggingface` afterward, same as the embedding model, and loads
in well under a second once cached.

**If a model download hangs** rather than failing outright (seen once
during development — files fully downloaded but the process sat idle for
tens of minutes on a stalled network round-trip), the fix is to confirm
the files are actually present (`du -sh ~/.cache/huggingface/hub/models--gpt2`)
and, if so, retry with `HF_HUB_OFFLINE=1` set to skip the network check
entirely and load straight from the local cache:

```bash
HF_HUB_OFFLINE=1 uvicorn app.main:app --reload
```

`scripts/calibrate_binoculars.py` reproduces Module B's threshold
calibration — see `docs/architecture.md` and `docs/benchmark.md`.

**All scripts under `scripts/` import from `app.*`, so run them with
`PYTHONPATH=.` from `apps/api`** (pytest is configured with its own
`pythonpath`, so this only matters for direct `python scripts/...` runs).

## Module C (trained classifier) notes

Trains a logistic regression over hand-picked stylometric features
(`app/classifier/features.py`) on [HC3](https://huggingface.co/datasets/Hello-SimpleAI/HC3)
(CC-BY-SA 4.0 — see `docs/dataset.md`), wrapped in split conformal
prediction so `/classify/text` returns a coverage-guaranteed interval
around its AI-probability estimate instead of a bare percentage.

```bash
PYTHONPATH=. python scripts/prepare_hc3.py       # downloads + splits HC3 into apps/api/data/classifier/
PYTHONPATH=. python scripts/train_classifier.py  # trains + evaluates + writes app/classifier/artifact/model.json
```

The trained artifact (`app/classifier/artifact/model.json`) **is** committed
— unlike the dataset CSVs it's trained from, it's a small, human-readable
set of learned parameters, not a copy of third-party data, and the API
needs it at runtime without retraining on every deploy. Re-run both scripts
and commit the new artifact if `features.py` or the training data changes.

## Module D (file provenance) notes

Verifies [C2PA](https://c2pa.org/) Content Credentials manifests (via the
official `c2pa-python` SDK — real cryptographic verification, not a
reimplementation) and surfaces EXIF metadata (via Pillow) for uploaded
images. Images only (JPEG/PNG/WEBP, ≤20MB) — see `docs/architecture.md` and
`docs/limitations.md` for why PDFs aren't supported.

`tests/fixtures/c2pa/{C,CA}.jpg` are real, validly-signed test images from
the [c2pa-rs](https://github.com/contentauth/c2pa-rs) project (Apache-2.0)
— see `tests/fixtures/c2pa/README.md`. No setup script needed; unlike
Modules B/C/F this module needs no downloaded model weights or dataset.

## Module G (Attack Lab) notes

Three structural attacks (synonym substitution, sentence reordering,
truncation — `app/attacks/attacks.py`) need nothing extra. The fourth,
real paraphrasing (`app/attacks/paraphrase.py`), needs a ~240MB T5 model
(`mrm8488/t5-small-finetuned-quora-for-paraphrasing`) downloaded on first
use, same lazy-load pattern as Modules B/F — if it can't load (no network,
or not enough disk), `/attacks/apply` returns a 503 with a clear message
rather than hanging or crashing.

```bash
PYTHONPATH=. python scripts/attack_lab_benchmark.py  # per-module accuracy-under-attack table
```

Reuses `scripts/calibrate_binoculars.py`'s 8 human / 8 AI-generated
samples; writes nothing, just prints a table (see `docs/benchmark.md` for
the actual run and `docs/architecture.md` for what it found).
