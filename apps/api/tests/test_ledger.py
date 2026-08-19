"""Tests for the Ledger class's storage/retrieval logic.

These inject a fast, deterministic fake embedding (bag-of-words over a
small hashed vocabulary) instead of the real fastembed model, so this file
runs in milliseconds with no model load or network access. The real model
is exercised separately in test_embeddings.py and test_ledger_router.py's
one end-to-end test.
"""

from __future__ import annotations

import re
import zlib
from pathlib import Path

import numpy as np
import pytest

from app.ledger import Ledger

FAKE_DIM = 32


def fake_embed(text: str) -> np.ndarray:
    words = re.findall(r"[a-z]+", text.lower())
    vector = np.zeros(FAKE_DIM, dtype=np.float32)
    for word in words:
        vector[zlib.crc32(word.encode()) % FAKE_DIM] += 1.0
    norm = np.linalg.norm(vector)
    return vector / norm if norm > 0 else vector


@pytest.fixture
def ledger(tmp_path: Path) -> Ledger:
    return Ledger(db_path=tmp_path / "ledger.db", embed_fn=fake_embed)


def test_log_and_count(ledger: Ledger) -> None:
    assert ledger.count() == 0
    ledger.log("The committee approved the budget.", source="manual")
    assert ledger.count() == 1


def test_log_rejects_empty_text(ledger: Ledger) -> None:
    with pytest.raises(ValueError):
        ledger.log("   ", source="manual")


def test_log_returns_populated_entry(ledger: Ledger) -> None:
    entry = ledger.log("Hello world", source="greenlist")
    assert entry.id > 0
    assert entry.text == "Hello world"
    assert entry.source == "greenlist"
    assert entry.created_at  # non-empty ISO timestamp


def test_list_recent_is_newest_first(ledger: Ledger) -> None:
    ledger.log("first", source="manual")
    ledger.log("second", source="manual")
    ledger.log("third", source="manual")
    texts = [e.text for e in ledger.list_recent()]
    assert texts == ["third", "second", "first"]


def test_list_recent_respects_limit(ledger: Ledger) -> None:
    for i in range(5):
        ledger.log(f"entry {i}", source="manual")
    assert len(ledger.list_recent(limit=2)) == 2


def test_find_nearest_on_empty_ledger_returns_empty(ledger: Ledger) -> None:
    assert ledger.find_nearest("anything") == []


def test_find_nearest_ranks_by_word_overlap(ledger: Ledger) -> None:
    ledger.log("The committee approved the new budget on Tuesday.", source="manual")
    ledger.log("The cat slept on the warm windowsill all afternoon.", source="manual")

    matches = ledger.find_nearest("On Tuesday the committee approved a budget.")
    assert matches[0].entry.text.startswith("The committee")
    assert matches[0].similarity > matches[1].similarity


def test_find_nearest_respects_top_k(ledger: Ledger) -> None:
    for i in range(5):
        ledger.log(f"entry number {i}", source="manual")
    assert len(ledger.find_nearest("entry number 3", top_k=2)) == 2


def test_identical_text_scores_similarity_one(ledger: Ledger) -> None:
    ledger.log("The quick brown fox.", source="manual")
    matches = ledger.find_nearest("The quick brown fox.")
    assert matches[0].similarity == pytest.approx(1.0, abs=1e-5)


def test_persists_across_ledger_instances(tmp_path: Path) -> None:
    db_path = tmp_path / "ledger.db"
    Ledger(db_path=db_path, embed_fn=fake_embed).log("persisted entry", source="manual")

    reopened = Ledger(db_path=db_path, embed_fn=fake_embed)
    assert reopened.count() == 1
    assert reopened.list_recent()[0].text == "persisted entry"
