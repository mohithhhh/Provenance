"""Module B: zero-shot statistical detector.

Three signals, computed from two small, real, off-the-shelf language
models (gpt2 as "performer", distilgpt2 as "observer" — see
app/detectors/models.py) run in teacher-forced mode over the input text:

- **Binoculars-style cross-perplexity** — an independent implementation of
  the general approach in Hans, Schwarzschild, Cherepanova, Kazemi, Saha,
  Goldblum, Geiping, Goldstein, "Binoculars: Zero-Shot Detection of
  LLM-Generated Text" (2024). The paper pairs two ~7B models (Falcon-7B and
  its instruction-tuned twin) and calibrates a threshold (0.9015) on a
  large corpus; this project uses much smaller models (gpt2/distilgpt2,
  chosen for a from-scratch demo that has to run on a laptop CPU) and
  recalibrates its own threshold empirically instead of reusing theirs —
  see docs/architecture.md for the calibration data and reasoning.
- **GLTR-style rank buckets** — Gehrmann, Strobelt, Rush, "GLTR:
  Statistical Detection and Visualization of Generated Text" (2019): where
  does each actual token fall in the model's own predicted ranking of
  likely next tokens.
- **Burstiness** — variance of per-sentence surprisal across the text; also
  from the GLTR line of work, though not itself a classifier here.

Like Modules B/C generally, this shares the base-model blind spot and every
other caveat documented in docs/limitations.md — it is not, and does not
claim to be, comparable to a real production detector.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass

import torch

from .models import get_observer_model, get_performer_model, get_tokenizer

# GLTR rank buckets, in order.
_RANK_BUCKETS: list[tuple[int, str]] = [(10, "top10"), (100, "top100"), (1000, "top1000")]

MIN_TOKENS = 2


def _bucket_for_rank(rank: int) -> str:
    for limit, name in _RANK_BUCKETS:
        if rank < limit:
            return name
    return "rest"


@dataclass(frozen=True)
class TokenStat:
    token: str
    rank: int
    bucket: str
    surprisal: float  # -log P(token | context), nats, under the performer model


@dataclass(frozen=True)
class TextStats:
    tokens: list[TokenStat]
    perplexity: float
    cross_perplexity: float
    binoculars_score: float
    top10_fraction: float


def analyze_text(text: str) -> TextStats:
    """Runs both models once (teacher-forced) over `text` and computes
    every per-token and aggregate statistic Module B reports, in one pass.
    Raises ValueError if the text is too short to score (fewer than
    MIN_TOKENS+1 tokens — the first token never gets a prediction, since
    there's no preceding context)."""
    tokenizer = get_tokenizer()
    input_ids = torch.tensor([tokenizer.encode(text)])
    if input_ids.shape[1] < MIN_TOKENS + 1:
        raise ValueError(
            f"Text is too short to score (needs at least {MIN_TOKENS + 1} tokens)."
        )

    performer = get_performer_model()
    observer = get_observer_model()

    with torch.no_grad():
        performer_logits = performer(input_ids).logits[0]  # (seq_len, vocab)
        observer_logits = observer(input_ids).logits[0]

    # logits[i] predicts token i+1; the final position predicts nothing we
    # have ground truth for, so it's dropped.
    performer_logits = performer_logits[:-1]
    observer_logits = observer_logits[:-1]
    targets = input_ids[0, 1:]

    performer_log_probs = torch.log_softmax(performer_logits, dim=-1)
    observer_log_probs = torch.log_softmax(observer_logits, dim=-1)
    performer_probs = performer_log_probs.exp()

    target_col = targets.unsqueeze(1)
    token_log_probs = performer_log_probs.gather(1, target_col).squeeze(1)
    surprisals = (-token_log_probs).tolist()

    # GLTR: how many vocabulary entries the performer ranked *above* the
    # actual token at that position — 0 means "its own top pick".
    ranks = (performer_logits > performer_logits.gather(1, target_col)).sum(dim=1).tolist()

    token_strs = [tokenizer.decode([t]) for t in targets.tolist()]
    token_stats = [
        TokenStat(token=tok, rank=rank, bucket=_bucket_for_rank(rank), surprisal=surprisal)
        for tok, rank, surprisal in zip(token_strs, ranks, surprisals, strict=True)
    ]

    perplexity = math.exp(sum(surprisals) / len(surprisals))

    # Cross-entropy between the performer's and observer's predictive
    # distributions at each position, both conditioned on the same real
    # prefix — the core Binoculars-style cross-perplexity term.
    cross_entropies = -(performer_probs * observer_log_probs).sum(dim=-1)
    cross_perplexity = math.exp(cross_entropies.mean().item())

    binoculars_score = perplexity / cross_perplexity
    top10_fraction = sum(1 for t in token_stats if t.bucket == "top10") / len(token_stats)

    return TextStats(
        tokens=token_stats,
        perplexity=perplexity,
        cross_perplexity=cross_perplexity,
        binoculars_score=binoculars_score,
        top10_fraction=top10_fraction,
    )


_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")


def split_sentences(text: str) -> list[str]:
    """A regex sentence splitter, not a real sentence tokenizer — it will
    mis-split on abbreviations ("Dr. Smith") and similar edge cases. A
    documented, honest simplification in the same spirit as Module A's toy
    `tokenize()`, not a hidden bug."""
    return [s.strip() for s in _SENTENCE_SPLIT_RE.split(text.strip()) if s.strip()]


@dataclass(frozen=True)
class SentenceStat:
    text: str
    mean_surprisal: float
    top10_fraction: float
    scored: bool  # False if the sentence was too short to score


def analyze_sentences(text: str) -> list[SentenceStat]:
    """Scores each sentence independently (its own tokenization, no prior-
    sentence context) — simpler than carrying document context across
    sentence boundaries, at the cost of losing that context's effect on
    perplexity. Each sentence's first token is still unscored for the same
    reason a whole short text would be."""
    results = []
    for sentence in split_sentences(text):
        try:
            stats = analyze_text(sentence)
        except ValueError:
            results.append(
                SentenceStat(text=sentence, mean_surprisal=0.0, top10_fraction=0.0, scored=False)
            )
            continue
        mean_surprisal = sum(t.surprisal for t in stats.tokens) / len(stats.tokens)
        results.append(
            SentenceStat(
                text=sentence,
                mean_surprisal=mean_surprisal,
                top10_fraction=stats.top10_fraction,
                scored=True,
            )
        )
    return results


def burstiness(values: list[float]) -> float:
    """(σ - μ) / (σ + μ) over a series of per-unit values (here, per-
    sentence mean surprisal). Positive = more variable than its own mean;
    near zero = uniform. Human-authored text is generally found to be
    burstier than machine-generated text (Gehrmann et al., 2019) — a real,
    computed signal shown alongside the others, not a standalone verdict."""
    n = len(values)
    if n < 2:
        return 0.0
    mean = sum(values) / n
    variance = sum((v - mean) ** 2 for v in values) / n
    stdev = math.sqrt(variance)
    if stdev + mean == 0:
        return 0.0
    return (stdev - mean) / (stdev + mean)
