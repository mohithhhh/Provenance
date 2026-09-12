"""Module G (Attack Lab): structural text perturbations.

Three of this module's four attack types — deliberately simple, structural
analogs of real editing, in the same spirit as Module A's own robustness
attacks (`packages/watermark-core/src/attacks.ts`), but operating on
arbitrary real text rather than the watermark demo's toy vocabulary. The
fourth, real paraphrasing (an actual model rewriting meaning), is
`paraphrase.py` — expected to be considerably more damaging to every other
module than anything here; see docs/limitations.md.
"""

from __future__ import annotations

import random
import re
from typing import Literal

from ..detectors.perplexity import split_sentences
from .paraphrase import paraphrase

AttackType = Literal["synonym", "reorder", "truncate", "paraphrase"]
ATTACK_TYPES: tuple[AttackType, ...] = ("synonym", "reorder", "truncate", "paraphrase")

ATTACK_LABELS: dict[AttackType, str] = {
    "synonym": "Synonym substitution",
    "reorder": "Sentence reordering",
    "truncate": "Truncation",
    "paraphrase": "Paraphrase (T5)",
}

# A small, hand-picked dictionary — not real WordNet-scale coverage. An
# honest simplification appropriate for a demo attack (same spirit as
# Module A's toy grammar): enough common words to make the attack visible
# on ordinary prose, not a claim of general synonym coverage.
# ponytail: hand-picked dict, upgrade to nltk WordNet if disk/network allow.
SYNONYMS: dict[str, str] = {
    "good": "great",
    "bad": "poor",
    "big": "large",
    "small": "little",
    "happy": "glad",
    "sad": "unhappy",
    "fast": "quick",
    "slow": "sluggish",
    "said": "stated",
    "important": "significant",
    "help": "assist",
    "use": "utilize",
    "make": "create",
    "show": "demonstrate",
    "get": "obtain",
    "give": "provide",
    "think": "believe",
    "know": "understand",
    "find": "discover",
    "start": "begin",
    "end": "finish",
    "buy": "purchase",
    "try": "attempt",
    "keep": "retain",
    "look": "observe",
    "want": "desire",
    "need": "require",
    "ask": "inquire",
    "tell": "inform",
    "let": "allow",
    "put": "place",
    "come": "arrive",
    "see": "view",
    "way": "manner",
    "very": "extremely",
    "many": "numerous",
    "much": "considerable",
    "also": "additionally",
    "because": "since",
    "problem": "issue",
    "answer": "response",
    "question": "inquiry",
    "idea": "concept",
    "work": "labor",
    "money": "funds",
    "house": "residence",
    "car": "vehicle",
    "book": "volume",
    "friend": "companion",
    "world": "globe",
    "life": "existence",
}

_WORD_RE = re.compile(r"[A-Za-z']+")


def _match_case(original: str, replacement: str) -> str:
    if original.isupper():
        return replacement.upper()
    if original[0].isupper():
        return replacement.capitalize()
    return replacement


def synonym_substitute(text: str, strength: float, seed: int = 0) -> str:
    """Replaces a `strength` fraction of words that have a known synonym
    with that synonym, preserving case and all surrounding punctuation/
    spacing exactly. Words with no entry in SYNONYMS are left untouched,
    so the effective substitution rate on arbitrary text is usually lower
    than `strength` — an honest limit of a small hand-picked dictionary,
    not a bug."""
    matches = list(_WORD_RE.finditer(text))
    eligible = [m for m in matches if m.group(0).lower() in SYNONYMS]
    count = round(strength * len(eligible))
    rng = random.Random(seed)
    chosen = set(rng.sample(range(len(eligible)), k=min(count, len(eligible))))

    parts = []
    last_end = 0
    eligible_idx = 0
    for m in matches:
        parts.append(text[last_end : m.start()])
        word = m.group(0)
        if word.lower() in SYNONYMS:
            if eligible_idx in chosen:
                word = _match_case(word, SYNONYMS[word.lower()])
            eligible_idx += 1
        parts.append(word)
        last_end = m.end()
    parts.append(text[last_end:])
    return "".join(parts)


def reorder_sentences(text: str, strength: float, seed: int = 0) -> str:
    """Shuffles a `strength` fraction of sentences among themselves (a
    partial Fisher-Yates over a random subset of positions, mirroring
    `reorderAttack` in packages/watermark-core/src/attacks.ts) — every
    sentence survives verbatim, only their order changes."""
    sentences = split_sentences(text)
    if len(sentences) < 2:
        return text
    rng = random.Random(seed)
    n = len(sentences)
    count = round(strength * n)
    chosen = rng.sample(range(n), k=min(count, n))
    values = [sentences[i] for i in chosen]
    rng.shuffle(values)
    result = sentences[:]
    for idx, value in zip(chosen, values, strict=True):
        result[idx] = value
    return " ".join(result)


def truncate(text: str, strength: float) -> str:
    """Keeps only the first `(1 - strength)` fraction of words, discarding
    the rest — the simplest possible attack, and a real one: any detector
    that needs the whole document degrades as less of it remains."""
    words = text.split()
    keep = round((1 - strength) * len(words))
    return " ".join(words[:keep])


def apply_attack(text: str, attack: AttackType, strength: float, seed: int = 0) -> str:
    if attack == "synonym":
        return synonym_substitute(text, strength, seed)
    if attack == "reorder":
        return reorder_sentences(text, strength, seed)
    if attack == "truncate":
        return truncate(text, strength)
    if attack == "paraphrase":
        return paraphrase(text)
    raise ValueError(f"Unknown attack type: {attack!r}")
