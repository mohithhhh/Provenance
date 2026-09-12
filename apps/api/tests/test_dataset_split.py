"""Unit tests for the deterministic train/calibration/test split used by
scripts/prepare_hc3.py. Splits by question id (not by individual answer) so
a question's human+AI answer pair never straddles two splits."""

from __future__ import annotations

from app.classifier.dataset import stratified_split

IDS = [f"q{i}" for i in range(100)]


def test_split_sizes_match_ratios() -> None:
    train, calib, test = stratified_split(IDS, seed=0, ratios=(0.6, 0.2, 0.2))
    assert len(train) == 60
    assert len(calib) == 20
    assert len(test) == 20


def test_splits_are_disjoint_and_cover_every_id() -> None:
    train, calib, test = stratified_split(IDS, seed=0, ratios=(0.6, 0.2, 0.2))
    assert set(train) & set(calib) == set()
    assert set(train) & set(test) == set()
    assert set(calib) & set(test) == set()
    assert set(train) | set(calib) | set(test) == set(IDS)


def test_same_seed_is_reproducible() -> None:
    first = stratified_split(IDS, seed=42)
    second = stratified_split(IDS, seed=42)
    assert first == second


def test_different_seed_gives_a_different_split() -> None:
    first = stratified_split(IDS, seed=1)
    second = stratified_split(IDS, seed=2)
    assert first != second
