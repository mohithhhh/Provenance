"""HTTP surface for Module C (trained classifier + calibrated confidence).

Unlike Module B (zero-shot, no training), this is a logistic regression
over stylometric features trained on HC3 (docs/dataset.md), wrapped in
split conformal prediction so the API reports a coverage-guaranteed
interval around its AI-probability estimate rather than one bare,
uncalibrated percentage — see app/classifier/model.py and
docs/limitations.md for what that guarantee does and doesn't promise.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..classifier.model import load_artifact, predict_from_artifact, verdict_from_probability

router = APIRouter(prefix="/classify", tags=["classify"])


class ClassifyRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20_000)


class FeatureContribution(BaseModel):
    name: str
    value: float
    contribution: float  # this feature's signed contribution to the logit


class ClassifyResponse(BaseModel):
    verdict: str
    aiProbability: float
    intervalLow: float
    intervalHigh: float
    confidenceLevel: float
    features: list[FeatureContribution]


@router.post("/text", response_model=ClassifyResponse)
def classify_text(payload: ClassifyRequest) -> ClassifyResponse:
    try:
        artifact = load_artifact()
    except FileNotFoundError as err:
        raise HTTPException(
            status_code=503,
            detail="Classifier artifact missing — run scripts/train_classifier.py.",
        ) from err

    prediction = predict_from_artifact(artifact, payload.text)

    return ClassifyResponse(
        verdict=verdict_from_probability(prediction.ai_probability),
        aiProbability=round(prediction.ai_probability, 4),
        intervalLow=round(prediction.interval_low, 4),
        intervalHigh=round(prediction.interval_high, 4),
        confidenceLevel=1 - artifact.alpha,
        features=[
            FeatureContribution(name=name, value=round(value, 4), contribution=round(contrib, 4))
            for name, value, contrib in zip(
                artifact.feature_names,
                prediction.raw_features,
                prediction.contributions,
                strict=True,
            )
        ],
    )
