"""Unit tests for the paraphrase attack's error-translation logic. Never
attempts a real model load — this repo's own dev environment can't
reliably provide the ~240MB/network the real model needs (see
docs/limitations.md), so what's actually worth proving is that a failed
load turns into a clear ParaphraserUnavailable, not a raw OSError or a
hang. The real `paraphrase()` happy path is exercised only when the model
genuinely is available; that's outside this test suite's job."""

from __future__ import annotations

import pytest

from app.attacks.paraphrase import ParaphraserUnavailable, _load_or_raise


def test_returns_the_loaded_value_on_success() -> None:
    assert _load_or_raise(lambda: "a-loaded-model", "the thing") == "a-loaded-model"


def test_wraps_oserror_as_paraphraser_unavailable() -> None:
    def failing_load() -> None:
        raise OSError("no space left on device")

    with pytest.raises(ParaphraserUnavailable, match="the paraphrase tokenizer"):
        _load_or_raise(failing_load, "the paraphrase tokenizer")


def test_does_not_swallow_other_exception_types() -> None:
    def failing_load() -> None:
        raise ValueError("something unrelated")

    with pytest.raises(ValueError):
        _load_or_raise(failing_load, "the thing")
