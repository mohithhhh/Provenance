"""HTTP-level tests for POST /classify/text. Uses the real trained artifact
(app/classifier/artifact/model.json) — small and fast to load, unlike
Module B's real language models, so there's no reason to mock it."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# A long, plainly hedged, first-person account — the kind of stylistic
# profile (contractions, varied sentence length, personal narrative) the
# classifier's training data associates with human answers.
HUMAN_SAMPLE = (
    "Honestly, I don't think there's one right answer here — it really "
    "depends on your situation. When I dealt with this a couple of years "
    "ago, I just asked around and eventually figured out a system that "
    "worked for me, even though it wasn't anything fancy."
)


def test_response_shape() -> None:
    response = client.post("/classify/text", json={"text": HUMAN_SAMPLE})
    assert response.status_code == 200
    body = response.json()
    for key in [
        "verdict",
        "aiProbability",
        "intervalLow",
        "intervalHigh",
        "confidenceLevel",
        "features",
    ]:
        assert key in body
    assert body["verdict"] in {"likely-ai", "likely-human", "uncertain"}
    assert 0.0 <= body["aiProbability"] <= 1.0
    assert body["intervalLow"] <= body["aiProbability"] <= body["intervalHigh"]
    assert len(body["features"]) > 0
    for feature in body["features"]:
        assert {"name", "value", "contribution"} <= feature.keys()


def test_rejects_empty_text() -> None:
    response = client.post("/classify/text", json={"text": ""})
    assert response.status_code == 422


def test_confidence_level_matches_artifact_alpha() -> None:
    response = client.post("/classify/text", json={"text": HUMAN_SAMPLE})
    # 1 - alpha; alpha=0.1 in the committed artifact (see scripts/train_classifier.py)
    assert response.json()["confidenceLevel"] == 0.9
