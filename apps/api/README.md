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
