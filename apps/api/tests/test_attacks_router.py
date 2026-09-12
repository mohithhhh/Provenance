"""HTTP-level tests for POST /attacks/apply. The paraphrase attack's
*unavailable* path is still monkeypatched — proving 503-on-failure doesn't
need the model itself to be absent, and shouldn't depend on whether it
happens to be cached on whatever machine runs this suite. Its *happy* path
is exercised for real in test_paraphrase_attack_works_end_to_end, same
reasoning as Module B's tests: no fake would test anything meaningful."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.attacks.paraphrase import ParaphraserUnavailable
from app.main import app

client = TestClient(app)


def test_truncate_attack_matches_the_underlying_function() -> None:
    from app.attacks.attacks import truncate

    text = "one two three four five six"
    response = client.post(
        "/attacks/apply", json={"text": text, "attack": "truncate", "strength": 0.5}
    )
    assert response.status_code == 200
    assert response.json()["attackedText"] == truncate(text, 0.5)


def test_reorder_attack_is_deterministic_given_a_seed() -> None:
    text = "First one. Second one. Third one."
    payload = {"text": text, "attack": "reorder", "strength": 1.0, "seed": 5}
    first = client.post("/attacks/apply", json=payload).json()
    second = client.post("/attacks/apply", json=payload).json()
    assert first == second


def test_rejects_unknown_attack_type() -> None:
    response = client.post(
        "/attacks/apply", json={"text": "hello", "attack": "not-a-real-attack", "strength": 0.5}
    )
    assert response.status_code == 422


def test_rejects_strength_out_of_range() -> None:
    response = client.post(
        "/attacks/apply", json={"text": "hello", "attack": "truncate", "strength": 1.5}
    )
    assert response.status_code == 422


def test_paraphrase_unavailable_returns_a_clean_503(monkeypatch: pytest.MonkeyPatch) -> None:
    def unavailable(text: str) -> str:
        raise ParaphraserUnavailable("model not cached and no network access")

    monkeypatch.setattr("app.attacks.attacks.paraphrase", unavailable)
    response = client.post(
        "/attacks/apply", json={"text": "hello there", "attack": "paraphrase", "strength": 0.5}
    )
    assert response.status_code == 503
    assert "not cached" in response.json()["detail"]


def test_paraphrase_attack_works_end_to_end() -> None:
    response = client.post(
        "/attacks/apply",
        json={
            "text": "What is the best way to learn a new programming language?",
            "attack": "paraphrase",
            "strength": 0.5,
        },
    )
    assert response.status_code == 200
    assert response.json()["attackedText"].strip() != ""
