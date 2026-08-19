"""HTTP surface for Module F (retrieval provenance ledger)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..ledger import DEFAULT_SIMILARITY_THRESHOLD, Ledger, Match

router = APIRouter(prefix="/ledger", tags=["ledger"])

_ledger_singleton: Ledger | None = None


def get_ledger() -> Ledger:
    """FastAPI dependency — overridden in tests via app.dependency_overrides
    to point at a temp DB instead of touching the real one."""
    global _ledger_singleton
    if _ledger_singleton is None:
        _ledger_singleton = Ledger()
    return _ledger_singleton


class LogRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20_000)
    source: str = Field(default="manual", max_length=100)


class LogResponse(BaseModel):
    id: int
    createdAt: str


class CheckRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20_000)
    threshold: float = Field(default=DEFAULT_SIMILARITY_THRESHOLD, ge=0.0, le=1.0)


class MatchResponse(BaseModel):
    id: int
    similarity: float
    snippet: str
    source: str
    createdAt: str


class CheckResponse(BaseModel):
    matched: bool
    threshold: float
    bestMatch: MatchResponse | None
    topMatches: list[MatchResponse]


class EntryResponse(BaseModel):
    id: int
    snippet: str
    source: str
    createdAt: str


class StatsResponse(BaseModel):
    count: int


def _snippet(text: str, limit: int = 240) -> str:
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def _to_match_response(match: Match) -> MatchResponse:
    return MatchResponse(
        id=match.entry.id,
        similarity=round(match.similarity, 4),
        snippet=_snippet(match.entry.text),
        source=match.entry.source,
        createdAt=match.entry.created_at,
    )


@router.post("/log", response_model=LogResponse)
def log_entry(payload: LogRequest, ledger: Ledger = Depends(get_ledger)) -> LogResponse:
    entry = ledger.log(text=payload.text, source=payload.source)
    return LogResponse(id=entry.id, createdAt=entry.created_at)


@router.post("/check", response_model=CheckResponse)
def check_entry(payload: CheckRequest, ledger: Ledger = Depends(get_ledger)) -> CheckResponse:
    matches = ledger.find_nearest(payload.text, top_k=3)
    top_matches = [_to_match_response(m) for m in matches]
    clears_threshold = top_matches and top_matches[0].similarity >= payload.threshold
    best = top_matches[0] if clears_threshold else None
    return CheckResponse(
        matched=best is not None,
        threshold=payload.threshold,
        bestMatch=best,
        topMatches=top_matches,
    )


@router.get("/stats", response_model=StatsResponse)
def stats(ledger: Ledger = Depends(get_ledger)) -> StatsResponse:
    return StatsResponse(count=ledger.count())


@router.get("", response_model=list[EntryResponse])
def list_entries(limit: int = 20, ledger: Ledger = Depends(get_ledger)) -> list[EntryResponse]:
    limit = max(1, min(limit, 100))
    entries = ledger.list_recent(limit=limit)
    return [
        EntryResponse(id=e.id, snippet=_snippet(e.text), source=e.source, createdAt=e.created_at)
        for e in entries
    ]
