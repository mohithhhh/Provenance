"""Stylometric feature extraction for Module C (trained classifier).

Classic stylometry — sentence/word length, lexical diversity, punctuation
habits, and function-word frequency — rather than anything model-based
(unlike Modules B/F). Pure Python + `re`, no NLP dependency: each feature
is cheap enough, and honest enough about being an approximation (word
tokenization here is a plain letter/apostrophe regex, not a real
tokenizer — the same spirit as Module B's regex sentence splitter).

`FEATURE_NAMES` is the single source of truth for feature order; every
consumer (training script, API response, feature-importance display) reads
this in the same order `extract_features` returns values in.
"""

from __future__ import annotations

import re
from statistics import pstdev

from ..detectors.perplexity import split_sentences

_WORD_RE = re.compile(r"[a-z']+")

# A small, fixed set of common English function words — classic stylometry
# signal (authors vary systematically in how often they use these,
# independent of topic). Not exhaustive; extending this list is cheap if a
# trained model's coefficients suggest it's worth it.
_FUNCTION_WORDS = ("the", "of", "and", "to", "a", "in", "is", "that", "it", "for")

FEATURE_NAMES: tuple[str, ...] = (
    "avg_sentence_len_words",
    "sentence_len_stdev",
    "avg_word_len_chars",
    "type_token_ratio",
    "comma_ratio",
    "period_ratio",
    "question_ratio",
    "exclamation_ratio",
    "contraction_ratio",
    *(f"func_{w}" for w in _FUNCTION_WORDS),
)


def _words(text: str) -> list[str]:
    return _WORD_RE.findall(text.lower())


def extract_features(text: str) -> tuple[float, ...]:
    """Returns one float per `FEATURE_NAMES` entry, in that order. Text with
    no extractable words (empty, or punctuation-only) returns an all-zero
    vector rather than dividing by zero — a degenerate but documented edge
    case, not a crash."""
    words = _words(text)
    word_count = len(words)
    if word_count == 0:
        return tuple(0.0 for _ in FEATURE_NAMES)

    sentence_word_counts = [len(_words(s)) for s in split_sentences(text)]
    avg_sentence_len = (
        sum(sentence_word_counts) / len(sentence_word_counts) if sentence_word_counts else 0.0
    )
    sentence_len_stdev = pstdev(sentence_word_counts) if len(sentence_word_counts) > 1 else 0.0

    avg_word_len = sum(len(w) for w in words) / word_count
    type_token_ratio = len(set(words)) / word_count
    contraction_ratio = sum(1 for w in words if "'" in w) / word_count

    values = [
        avg_sentence_len,
        sentence_len_stdev,
        avg_word_len,
        type_token_ratio,
        text.count(",") / word_count,
        text.count(".") / word_count,
        text.count("?") / word_count,
        text.count("!") / word_count,
        contraction_ratio,
        *(words.count(w) / word_count for w in _FUNCTION_WORDS),
    ]
    return tuple(values)
