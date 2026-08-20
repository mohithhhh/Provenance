"""Provenance API — FastAPI backend.

Phase 3 added Module F (retrieval provenance ledger); Phase 4 adds Module B
(zero-shot statistical detector). Modules C, D, G are added in later
phases; see the project README and docs/ for the phased build plan.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers.detect import router as detect_router
from .routers.ledger import router as ledger_router

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


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness check used by Docker Compose / CI / uptime monitoring."""
    return {"status": "ok"}
