# apps/api

FastAPI backend for Provenance. Hosts the modules that need a real language
model, embeddings, or scikit-learn (Modules B, C, F, G — added in later
phases).

## Local setup (without Docker)

Pinned to **Python 3.11** rather than the system's newest Python: ML
libraries used from Phase 4 onward (`torch`, `transformers`,
`sentence-transformers`) typically ship wheels for 3.11/3.12 well before
brand-new Python releases, so 3.11 is the safer default for this project
even though newer interpreters may be installed on your machine.

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
