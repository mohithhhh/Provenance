"""HTTP surface for Module B (zero-shot statistical detector)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..detectors.perplexity import (
    analyze_sentences,
    analyze_text,
    burstiness,
    verdict_from_binoculars_score,
)

router = APIRouter(prefix="/detect", tags=["detect"])


class DetectRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20_000)


class TokenResponse(BaseModel):
    token: str
    rank: int
    bucket: str


class SentenceResponse(BaseModel):
    text: str
    meanSurprisal: float
    topKFraction: float
    scored: bool


class DetectResponse(BaseModel):
    verdict: str
    binocularsScore: float
    perplexity: float
    crossPerplexity: float
    top10Fraction: float
    burstiness: float
    totalTokens: int
    tokens: list[TokenResponse]
    sentences: list[SentenceResponse]


@router.post("/statistical", response_model=DetectResponse)
def detect_statistical(payload: DetectRequest) -> DetectResponse:
    try:
        stats = analyze_text(payload.text)
    except ValueError as err:
        raise HTTPException(status_code=422, detail=str(err)) from err

    sentences = analyze_sentences(payload.text)
    sentence_surprisals = [s.mean_surprisal for s in sentences if s.scored]

    return DetectResponse(
        verdict=verdict_from_binoculars_score(stats.binoculars_score),
        binocularsScore=round(stats.binoculars_score, 4),
        perplexity=round(stats.perplexity, 3),
        crossPerplexity=round(stats.cross_perplexity, 3),
        top10Fraction=round(stats.top10_fraction, 4),
        burstiness=round(burstiness(sentence_surprisals), 4),
        totalTokens=len(stats.tokens),
        tokens=[TokenResponse(token=t.token, rank=t.rank, bucket=t.bucket) for t in stats.tokens],
        sentences=[
            SentenceResponse(
                text=s.text,
                meanSurprisal=round(s.mean_surprisal, 3),
                topKFraction=round(s.top10_fraction, 4),
                scored=s.scored,
            )
            for s in sentences
        ],
    )
