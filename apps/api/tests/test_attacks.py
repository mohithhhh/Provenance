"""Unit tests for Module G's structural attacks (synonym substitution,
sentence reordering, truncation) — pure logic, deterministic given a seed,
no model/network involved. The paraphrase attack (real T5 model) is tested
separately at the router level, where its "unavailable" path is the thing
actually worth proving right now — see tests/test_attacks_router.py."""

from __future__ import annotations

import pytest

from app.attacks.attacks import (
    ATTACK_TYPES,
    apply_attack,
    reorder_sentences,
    synonym_substitute,
    truncate,
)


class TestTruncate:
    def test_keeps_requested_fraction_of_words(self) -> None:
        text = " ".join(f"word{i}" for i in range(10))
        result = truncate(text, strength=0.3)
        assert result.split() == text.split()[:7]  # round((1-0.3)*10) = 7

    def test_zero_strength_returns_full_text(self) -> None:
        text = "one two three"
        assert truncate(text, strength=0.0) == text

    def test_full_strength_returns_empty_string(self) -> None:
        assert truncate("one two three", strength=1.0) == ""


class TestReorderSentences:
    TEXT = "First sentence here. Second sentence here. Third sentence here. Fourth one too."

    def test_preserves_the_same_set_of_sentences(self) -> None:
        from app.detectors.perplexity import split_sentences

        result = reorder_sentences(self.TEXT, strength=1.0, seed=1)
        assert sorted(split_sentences(result)) == sorted(split_sentences(self.TEXT))

    def test_zero_strength_leaves_order_unchanged(self) -> None:
        assert reorder_sentences(self.TEXT, strength=0.0, seed=1) == self.TEXT

    def test_deterministic_given_the_same_seed(self) -> None:
        first = reorder_sentences(self.TEXT, strength=1.0, seed=7)
        second = reorder_sentences(self.TEXT, strength=1.0, seed=7)
        assert first == second

    def test_single_sentence_is_unaffected(self) -> None:
        text = "Just one sentence."
        assert reorder_sentences(text, strength=1.0, seed=1) == text


class TestSynonymSubstitute:
    def test_replaces_a_known_word(self) -> None:
        result = synonym_substitute("This is a good idea.", strength=1.0, seed=0)
        assert "good" not in result.split()

    def test_zero_strength_leaves_text_unchanged(self) -> None:
        text = "This is a good idea."
        assert synonym_substitute(text, strength=0.0, seed=0) == text

    def test_preserves_capitalization_of_replaced_word(self) -> None:
        result = synonym_substitute("Good idea.", strength=1.0, seed=0)
        replaced = result.split()[0].rstrip(".")
        assert replaced[0].isupper()

    def test_leaves_unknown_words_alone(self) -> None:
        text = "Zoinks flibbertigibbet."
        assert synonym_substitute(text, strength=1.0, seed=0) == text

    def test_preserves_surrounding_punctuation(self) -> None:
        result = synonym_substitute("It was good, actually.", strength=1.0, seed=0)
        assert "," in result
        assert result.endswith(".")


class TestApplyAttack:
    def test_dispatches_to_truncate(self) -> None:
        text = "one two three four"
        assert apply_attack(text, "truncate", 0.5, seed=0) == truncate(text, 0.5)

    def test_dispatches_to_reorder(self) -> None:
        text = "First one. Second one. Third one."
        assert apply_attack(text, "reorder", 1.0, seed=3) == reorder_sentences(text, 1.0, seed=3)

    def test_dispatches_to_synonym(self) -> None:
        text = "This is good."
        assert apply_attack(text, "synonym", 1.0, seed=0) == synonym_substitute(text, 1.0, seed=0)

    def test_rejects_unknown_attack_type(self) -> None:
        with pytest.raises(ValueError):
            apply_attack("text", "made-up-attack", 0.5)  # type: ignore[arg-type]

    def test_attack_types_lists_all_four(self) -> None:
        assert set(ATTACK_TYPES) == {"synonym", "reorder", "truncate", "paraphrase"}
