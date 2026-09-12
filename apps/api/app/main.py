"""Provenance API — FastAPI backend.

Phase 3 added Module F (retrieval provenance ledger); Phase 4 added Module B
(zero-shot statistical detector); Phase 5 added Module C (trained
classifier); Phase 6 added Module D (file provenance / C2PA); Phase 7 adds
Module G (Attack Lab). See the project README and docs/ for the phased
build plan.
"""

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

# Permissive CORS for local development. Tighten to the deployed web
# origin before shipping past Phase 0.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
