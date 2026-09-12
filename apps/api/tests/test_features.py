"""Unit tests for Module C's stylometric feature extraction. Pure, fast,
no model/network involved — see docs/architecture.md for why each feature
was picked."""

from __future__ import annotations

from app.classifier.features import FEATURE_NAMES, extract_features

SAMPLE = "The cat sat on the mat. The dog ran fast!"


def _value(text: str, name: str) -> float:
    return dict(zip(FEATURE_NAMES, extract_features(text), strict=True))[name]


def test_extract_features_returns_one_value_per_feature_name() -> None:
    assert len(extract_features(SAMPLE)) == len(FEATURE_NAMES)


def test_type_token_ratio() -> None:
    # 10 words, 8 distinct ("the" repeats 3x, all else unique).
    assert _value(SAMPLE, "type_token_ratio") == 0.8


def test_avg_word_len_chars() -> None:
    # the(3) cat(3) sat(3) on(2) the(3) mat(3) the(3) dog(3) ran(3) fast(4) -> 30/10
    assert _value(SAMPLE, "avg_word_len_chars") == 3.0


def test_avg_sentence_len_words() -> None:
    # "The cat sat on the mat." (6 words), "The dog ran fast!" (4 words) -> mean 5
    assert _value(SAMPLE, "avg_sentence_len_words") == 5.0


def test_sentence_len_stdev() -> None:
    # population stdev of [6, 4] around mean 5 is 1.0
    assert _value(SAMPLE, "sentence_len_stdev") == 1.0


def test_punctuation_ratios() -> None:
    assert _value(SAMPLE, "period_ratio") == 0.1  # 1 period / 10 words
    assert _value(SAMPLE, "exclamation_ratio") == 0.1  # 1 "!" / 10 words
    assert _value(SAMPLE, "comma_ratio") == 0.0
    assert _value(SAMPLE, "question_ratio") == 0.0


def test_function_word_frequency() -> None:
    # "the" occurs 3 of 10 words; every other tracked function word is absent.
    assert _value(SAMPLE, "func_the") == 0.3
    assert _value(SAMPLE, "func_of") == 0.0


def test_contraction_ratio() -> None:
    assert _value("I don't think that's right, isn't it?", "contraction_ratio") > 0
    assert _value(SAMPLE, "contraction_ratio") == 0.0


def test_empty_text_returns_all_zeros() -> None:
    assert extract_features("") == tuple(0.0 for _ in FEATURE_NAMES)


def test_single_word_text_does_not_crash() -> None:
    values = extract_features("Hello")
    assert len(values) == len(FEATURE_NAMES)
