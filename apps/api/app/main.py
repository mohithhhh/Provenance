"""Provenance API — FastAPI backend.

Phase 3 added Module F (retrieval provenance ledger); Phase 4 added Module B
(zero-shot statistical detector); Phase 5 added Module C (trained
classifier); Phase 6 added Module D (file provenance / C2PA); Phase 7 added
Module G (Attack Lab). Module E (Phase 8) and batch mode (Phase 9) are pure
frontend orchestration over these same endpoints — no new routes here. See
the project README and docs/ for the phased build plan.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers.attacks import router as attacks_router
from .routers.classify import router as classify_router
from .routers.detect import router as detect_router
from .routers.ledger import router as ledger_router
from .routers.provenance import router as provenance_router

app = FastAPI(
    title="Provenance API",
    description=(
        "Backend for the Provenance AI-content detection suite. "
        "Original, independent implementations for education/research — "
        "not a reverse-engineering of any vendor's production watermark "
        "or detection system."
    ),
    version="0.0.0",
)

# Permissive by default for local dev; set ALLOWED_ORIGINS (comma-separated)
# in production to the real deployed frontend origin(s) — see docs/deploy.md.
_allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ledger_router)
app.include_router(detect_router)
app.include_router(classify_router)
app.include_router(provenance_router)
app.include_router(attacks_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness check used by Docker Compose / CI / uptime monitoring."""
    return {"status": "ok"}
