"""HTTP-level tests for POST /detect/statistical."""

from __future__ import annotations

import torch
from fastapi.testclient import TestClient

from app.detectors.models import get_performer_model, get_tokenizer
from app.main import app

client = TestClient(app)

HUMAN_SAMPLE = (
    "The hiking trail near our cabin was closed last week because of a "
    "fallen tree, so we ended up taking the longer route through the meadow."
)


def _generate_ai_sample(prompt: str = "The weather today") -> str:
    """Same technique as scripts/calibrate_binoculars.py: gpt2 generating
    its own continuation, deterministic given the fixed seed."""
    tokenizer = get_tokenizer()
    model = get_performer_model()
    torch.manual_seed(0)
    input_ids = tokenizer.encode(prompt, return_tensors="pt")
    output = model.generate(
        input_ids,
        max_new_tokens=30,
        do_sample=True,
        top_p=0.95,
        temperature=1.0,
        pad_token_id=tokenizer.eos_token_id,
    )
    return str(tokenizer.decode(output[0], skip_special_tokens=True))


def test_response_shape() -> None:
    response = client.post("/detect/statistical", json={"text": HUMAN_SAMPLE})
    assert response.status_code == 200
    body = response.json()
    for key in [
        "verdict",
        "binocularsScore",
        "perplexity",
        "crossPerplexity",
        "top10Fraction",
        "burstiness",
        "totalTokens",
        "tokens",
        "sentences",
    ]:
        assert key in body
    assert body["verdict"] in {"likely-ai", "likely-human", "uncertain"}
    assert len(body["tokens"]) == body["totalTokens"]
    assert body["tokens"][0]["bucket"] in {"top10", "top100", "top1000", "rest"}


def test_original_human_written_sample_scores_likely_human() -> None:
    response = client.post("/detect/statistical", json={"text": HUMAN_SAMPLE})
    assert response.json()["verdict"] == "likely-human"


def test_gpt2_generated_sample_scores_likely_ai() -> None:
    ai_text = _generate_ai_sample()
    response = client.post("/detect/statistical", json={"text": ai_text})
    assert response.json()["verdict"] == "likely-ai"


def test_rejects_too_short_text() -> None:
    response = client.post("/detect/statistical", json={"text": "Hi"})
    assert response.status_code == 422


def test_rejects_empty_text() -> None:
    response = client.post("/detect/statistical", json={"text": ""})
    assert response.status_code == 422  # pydantic min_length


def test_sentences_are_split_and_scored() -> None:
    text = f"{HUMAN_SAMPLE} It was a nice change of scenery, honestly."
    response = client.post("/detect/statistical", json={"text": text})
    body = response.json()
    assert len(body["sentences"]) == 2
    assert all(s["scored"] for s in body["sentences"])
