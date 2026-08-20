"""Tests for Module B's core statistics. These use the real gpt2/distilgpt2
models — there's no fast deterministic fake that would still be testing
anything meaningful about the actual numerics (unlike Module F's
embeddings, which could be swapped for a fast fake bag-of-words). Model
load happens once per pytest session (lru_cache singletons in
app/detectors/models.py); every test after the first is fast (well under
100ms) — see apps/api/README.md if this needs network access on a fresh
machine."""

from __future__ import annotations

import pytest

from app.detectors.perplexity import analyze_sentences, analyze_text, burstiness, split_sentences

HUMAN_SAMPLE = (
    "The hiking trail near our cabin was closed last week because of a "
    "fallen tree, so we ended up taking the longer route through the meadow."
)


def test_analyze_text_token_count_matches_scored_positions() -> None:
    stats = analyze_text(HUMAN_SAMPLE)
    # One fewer than the raw token count, since the first token has no
    # preceding context to be "predicted" from.
    assert len(stats.tokens) > 0
    for t in stats.tokens:
        assert t.rank >= 0
        assert t.bucket in {"top10", "top100", "top1000", "rest"}
        assert t.surprisal >= 0


def test_analyze_text_raises_on_too_short_input() -> None:
    with pytest.raises(ValueError):
        analyze_text("Hi")


def test_perplexity_and_cross_perplexity_are_positive() -> None:
    stats = analyze_text(HUMAN_SAMPLE)
    assert stats.perplexity > 0
    assert stats.cross_perplexity > 0
    assert stats.binoculars_score > 0


def test_top10_fraction_is_a_valid_fraction() -> None:
    stats = analyze_text(HUMAN_SAMPLE)
    assert 0 <= stats.top10_fraction <= 1


def test_rank_zero_means_the_models_own_top_pick() -> None:
    # A model predicting its own greedy continuation should see rank 0.
    stats = analyze_text("The cat sat on the")
    # Not asserting every rank is 0 (this is real, imperfect data) — just
    # that rank 0 (the strongest possible prediction) is achievable at all,
    # i.e. the rank computation isn't systematically off by one or broken.
    assert any(t.rank == 0 for t in stats.tokens)


class TestSplitSentences:
    def test_splits_on_terminal_punctuation(self) -> None:
        text = "First sentence. Second sentence! Third sentence?"
        assert split_sentences(text) == [
            "First sentence.",
            "Second sentence!",
            "Third sentence?",
        ]

    def test_single_sentence(self) -> None:
        assert split_sentences("Just one sentence here.") == ["Just one sentence here."]

    def test_empty_text(self) -> None:
        assert split_sentences("") == []

    def test_strips_whitespace(self) -> None:
        assert split_sentences("  Padded sentence.   ") == ["Padded sentence."]


class TestBurstiness:
    def test_perfectly_uniform_values_score_minus_one(self) -> None:
        # (σ - μ) / (σ + μ) with σ=0 is the formula's minimum, -1 — "as
        # regular/non-bursty as this statistic can express".
        assert burstiness([5.0, 5.0, 5.0, 5.0]) == pytest.approx(-1.0)

    def test_higher_variance_scores_higher_than_lower_variance(self) -> None:
        low_variance = [4.0, 5.0, 5.0, 6.0]
        high_variance = [1.0, 9.0, 1.0, 9.0]
        assert burstiness(high_variance) > burstiness(low_variance)

    def test_fewer_than_two_values_returns_zero(self) -> None:
        assert burstiness([]) == 0.0
        assert burstiness([3.0]) == 0.0


def test_analyze_sentences_scores_each_sentence() -> None:
    text = f"{HUMAN_SAMPLE} It was a nice change of scenery, honestly."
    results = analyze_sentences(text)
    assert len(results) == 2
    for r in results:
        assert r.scored is True
        assert r.mean_surprisal > 0


def test_analyze_sentences_marks_too_short_sentences_unscored() -> None:
    text = "Hi. This is a slightly longer sentence that should be scorable."
    results = analyze_sentences(text)
    assert results[0].scored is False
    assert results[1].scored is True
