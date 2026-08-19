"""HTTP-level tests for /ledger/*. Most use dependency_overrides to swap in
a Ledger backed by the fast fake embedding from test_ledger.py (via a
tmp_path DB) — no model load, no network. One test exercises the real
model end-to-end to prove the actual wiring works, not just the mocked
path."""

from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.ledger import Ledger
from app.main import app
from app.routers.ledger import get_ledger
from tests.test_ledger import fake_embed


@pytest.fixture
def client(tmp_path: Path) -> Generator[TestClient, None, None]:
    test_ledger = Ledger(db_path=tmp_path / "ledger.db", embed_fn=fake_embed)
    app.dependency_overrides[get_ledger] = lambda: test_ledger
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_ledger, None)


def test_log_then_stats(client: TestClient) -> None:
    response = client.post("/ledger/log", json={"text": "Hello world", "source": "manual"})
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == 1
    assert "createdAt" in body

    stats = client.get("/ledger/stats").json()
    assert stats["count"] == 1


def test_log_rejects_empty_text(client: TestClient) -> None:
    response = client.post("/ledger/log", json={"text": "", "source": "manual"})
    assert response.status_code == 422  # pydantic min_length validation


def test_check_matches_logged_text(client: TestClient) -> None:
    client.post(
        "/ledger/log",
        json={"text": "The committee approved the new budget on Tuesday.", "source": "manual"},
    )
    response = client.post(
        "/ledger/check", json={"text": "On Tuesday the committee approved a new budget."}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["matched"] is True
    assert body["bestMatch"] is not None
    assert body["bestMatch"]["similarity"] > body["threshold"]


def test_check_does_not_match_unrelated_text(client: TestClient) -> None:
    client.post(
        "/ledger/log", json={"text": "The committee approved the budget.", "source": "manual"}
    )
    response = client.post("/ledger/check", json={"text": "zzz qqq xyzzy wibble blorp"})
    body = response.json()
    assert body["matched"] is False
    assert body["bestMatch"] is None
    # topMatches still surfaces the closest thing, for transparency, even
    # though it didn't clear the threshold.
    assert len(body["topMatches"]) == 1


def test_check_on_empty_ledger(client: TestClient) -> None:
    response = client.post("/ledger/check", json={"text": "anything"})
    body = response.json()
    assert body["matched"] is False
    assert body["topMatches"] == []


def test_list_entries(client: TestClient) -> None:
    for i in range(3):
        client.post("/ledger/log", json={"text": f"entry {i}", "source": "manual"})
    response = client.get("/ledger?limit=2")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_real_model_end_to_end() -> None:
    """No dependency override here — exercises the actual fastembed model
    through the real router wiring, via a fresh Ledger pointed at an
    isolated temp DB (not the module-level singleton, so it doesn't touch
    apps/api/data/ledger.db)."""
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        real_ledger = Ledger(db_path=Path(tmp) / "ledger.db")
        app.dependency_overrides[get_ledger] = lambda: real_ledger
        try:
            client = TestClient(app)
            client.post(
                "/ledger/log",
                json={
                    "text": "The committee approved the new budget on Tuesday.",
                    "source": "manual",
                },
            )
            response = client.post(
                "/ledger/check",
                json={"text": "Budget approval came from the committee this past Tuesday."},
            )
            assert response.json()["matched"] is True
        finally:
            app.dependency_overrides.pop(get_ledger, None)
