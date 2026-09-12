"""Tests for Module G's paraphrase attack.

`TestLoadOrRaise` never attempts a real model load — it tests the error-
translation logic in isolation (a failed load turns into a clear
ParaphraserUnavailable, not a raw OSError or a hang), independent of
whether the real model happens to be cached on whatever machine runs this
suite.

`TestParaphraseRealModel` uses the real, actual T5 model — same reasoning
as Module B's tests (test_perplexity.py): there's no fast deterministic
fake that would still be testing anything meaningful about real paraphrase
quality. This needs the model cached locally (~440MB, downloaded once from
Hugging Face — see docs/architecture.md and docs/limitations.md for what
this means for a fresh machine with no cache and limited disk)."""

from __future__ import annotations

import pytest

from app.attacks.paraphrase import ParaphraserUnavailable, _load_or_raise, paraphrase


class TestLoadOrRaise:
    def test_returns_the_loaded_value_on_success(self) -> None:
        assert _load_or_raise(lambda: "a-loaded-model", "the thing") == "a-loaded-model"

    def test_wraps_oserror_as_paraphraser_unavailable(self) -> None:
        def failing_load() -> None:
            raise OSError("no space left on device")

        with pytest.raises(ParaphraserUnavailable, match="the paraphrase tokenizer"):
            _load_or_raise(failing_load, "the paraphrase tokenizer")

    def test_does_not_swallow_other_exception_types(self) -> None:
        def failing_load() -> None:
            raise ValueError("something unrelated")

        with pytest.raises(ValueError):
            _load_or_raise(failing_load, "the thing")


class TestParaphraseRealModel:
    def test_returns_nonempty_text(self) -> None:
        result = paraphrase("What is the best way to learn a new programming language?")
        assert result.strip() != ""

    def test_is_deterministic_for_the_same_input(self) -> None:
        # Beam search (do_sample=False), so identical input always produces
        # identical output — no seed needed, unlike the structural attacks.
        text = "How can I improve my public speaking skills quickly?"
        assert paraphrase(text) == paraphrase(text)

    def test_preserves_most_of_the_original_wording(self) -> None:
        # This checkpoint is fine-tuned specifically on Quora question
        # pairs (see docs/architecture.md) — it makes small, conservative
        # edits rather than a full rewrite, especially on non-question
        # input. A real assertion of "still recognizably about the same
        # thing", not a fuzzy semantic-similarity check this project has
        # no cheap way to compute here.
        original = "What is the best way to learn a new programming language?"
        result = paraphrase(original)
        original_words = set(original.lower().split())
        result_words = set(result.lower().split())
        overlap = original_words & result_words
        assert len(overlap) / len(original_words) > 0.5
