#!/usr/bin/env python3
"""Module G's headline benchmark: per-module accuracy-under-attack, modeled
on the PADBen methodology (Zha et al., 2025) — a fixed test set of human vs.
AI-generated text, the standard attack suite run across it, and a table of
how well each module still gets it right afterward.

Reuses the exact same 8 human / 8 AI-generated samples as
scripts/calibrate_binoculars.py (original human sentences written for this
project; AI samples are gpt2 generating its own continuations, seed=0 —
the same reasoning applies here: no licensing question, no risk of a small
model having memorized a scraped sentence).

**Scope**: covers Modules B, C, and F — the three modules that operate on
arbitrary text with no setup step. Module A (watermarking) already has its
own real robustness benchmark using its own native structural attacks
(Phase 2, docs/benchmark.md) — re-running it here would need a second,
JS-based attack implementation for no new information, so it isn't
duplicated. The paraphrase attack isn't included either: it needs a ~240MB
model this project's own dev machine doesn't currently have room for (see
docs/limitations.md) — every number below is from a real run, and this
script doesn't fabricate a paraphrase row it can't actually measure.

Usage: PYTHONPATH=. python scripts/attack_lab_benchmark.py (from apps/api, venv active)
"""

from __future__ import annotations

import tempfile
from pathlib import Path

import torch

from app.attacks.attacks import apply_attack
from app.classifier.model import load_artifact, predict_from_artifact, verdict_from_probability
from app.detectors.models import get_performer_model, get_tokenizer
from app.detectors.perplexity import analyze_text, verdict_from_binoculars_score
from app.ledger import DEFAULT_SIMILARITY_THRESHOLD, Ledger

# Same samples as scripts/calibrate_binoculars.py — see that file for why
# these specific sentences/prompts were chosen.
HUMAN_SAMPLES = [
    "Yesterday I spent nearly an hour trying to fix a leaky faucet, only to "
    "discover the real problem was a cracked washer I had overlooked twice.",
    "My grandmother always said that the secret to good soup was patience, "
    "not seasoning, and after thirty years of cooking I finally believe her.",
    "The hiking trail near our cabin was closed last week because of a "
    "fallen tree, so we ended up taking the longer route through the meadow.",
    "Halfway through the meeting, someone realized the projector had been "
    "showing last quarter's numbers the entire time, which explained the "
    "confused questions from the back row.",
    "I've never been good at remembering birthdays, so three years ago I "
    "started keeping a small notebook just for that, and somehow I still "
    "forget to check it half the time.",
    "The bakery on the corner changed owners twice this year, and each time "
    "the bread got a little denser and the prices a little higher.",
    "Our cat refuses to drink from her water bowl unless it's been refilled "
    "within the last ten minutes, which my partner insists is a personality "
    "trait and not just pickiness.",
    "It took the city council four separate votes to agree on where to put "
    "the new bike lane, and even then two council members abstained.",
]

PROMPTS_FOR_AI_SAMPLES = [
    "The weather today",
    "In recent news,",
    "According to the report,",
    "Scientists have discovered",
    "The company announced that",
    "During the meeting, the team",
    "Local officials said the project",
    "The new policy will",
]

ATTACKS_TO_BENCHMARK = ["synonym", "reorder", "truncate"]
STRENGTHS = [0.3, 0.6]


def generate_ai_samples() -> list[str]:
    tokenizer = get_tokenizer()
    model = get_performer_model()
    torch.manual_seed(0)
    samples = []
    for prompt in PROMPTS_FOR_AI_SAMPLES:
        input_ids = tokenizer.encode(prompt, return_tensors="pt")
        output = model.generate(
            input_ids,
            max_new_tokens=30,
            do_sample=True,
            top_p=0.95,
            temperature=1.0,
            pad_token_id=tokenizer.eos_token_id,
        )
        samples.append(str(tokenizer.decode(output[0], skip_special_tokens=True)))
    return samples


def b_correct(attacked: str, label: int) -> bool:
    """label: 1 = AI, 0 = human. "uncertain" never counts as correct — a
    strict metric, but consistent with treating the uncertain band as
    exactly that: not a hit."""
    verdict = verdict_from_binoculars_score(analyze_text(attacked).binoculars_score)
    return (verdict == "likely-ai") == (label == 1) and verdict != "uncertain"


def c_correct(attacked: str, label: int) -> bool:
    artifact = load_artifact()
    prediction = predict_from_artifact(artifact, attacked)
    verdict = verdict_from_probability(prediction.ai_probability)
    return (verdict == "likely-ai") == (label == 1) and verdict != "uncertain"


def build_benchmark_ledger(samples: list[str]) -> tuple[Ledger, list[int]]:
    """A throwaway ledger, isolated from the real apps/api/data/ledger.db —
    every original sample logged once, each with its own row id, so
    "recognized after attack" can mean specifically "matched back to the
    same original", not just "matched something"."""
    db_path = Path(tempfile.mkstemp(suffix=".db")[1])
    ledger = Ledger(db_path=db_path)
    ids = [ledger.log(s, source="benchmark").id for s in samples]
    return ledger, ids


def f_correct(ledger: Ledger, attacked: str, expected_id: int) -> bool:
    matches = ledger.find_nearest(attacked, top_k=1)
    if not matches:
        return False
    best = matches[0]
    return best.similarity >= DEFAULT_SIMILARITY_THRESHOLD and best.entry.id == expected_id


def main() -> None:
    ai_samples = generate_ai_samples()
    samples = HUMAN_SAMPLES + ai_samples
    labels = [0] * len(HUMAN_SAMPLES) + [1] * len(ai_samples)
    ledger, ids = build_benchmark_ledger(samples)

    print(f"{len(HUMAN_SAMPLES)} human + {len(ai_samples)} AI (gpt2, seed=0) samples\n")
    header = (
        f"{'attack':<10} {'strength':>8} "
        f"{'B (statistical)':>16} {'C (classifier)':>15} {'F (retrieval)':>14}"
    )
    print(header)
    print("-" * len(header))

    # Baseline (no attack at all) first — without it, a low accuracy-
    # under-attack number reads as "this attack broke the module", when it
    # might mean the module never worked on this test set to begin with.
    n = len(samples)
    b_baseline = sum(b_correct(t, label) for t, label in zip(samples, labels, strict=True))
    c_baseline = sum(c_correct(t, label) for t, label in zip(samples, labels, strict=True))
    f_baseline = sum(
        f_correct(ledger, t, expected_id) for t, expected_id in zip(samples, ids, strict=True)
    )
    print(
        f"{'(none)':<10} {'—':>8} "
        f"{b_baseline}/{n} ({b_baseline / n:.0%}){'':>3} "
        f"{c_baseline}/{n} ({c_baseline / n:.0%}){'':>2} "
        f"{f_baseline}/{n} ({f_baseline / n:.0%})"
    )

    for attack in ATTACKS_TO_BENCHMARK:
        for strength in STRENGTHS:
            attacked_texts = [apply_attack(s, attack, strength, seed=0) for s in samples]  # type: ignore[arg-type]

            b_hits = sum(
                b_correct(t, label) for t, label in zip(attacked_texts, labels, strict=True)
            )
            c_hits = sum(
                c_correct(t, label) for t, label in zip(attacked_texts, labels, strict=True)
            )
            f_hits = sum(
                f_correct(ledger, t, expected_id)
                for t, expected_id in zip(attacked_texts, ids, strict=True)
            )
            n = len(samples)
            print(
                f"{attack:<10} {strength:>8.1f} "
                f"{b_hits}/{n} ({b_hits / n:.0%}){'':>3} "
                f"{c_hits}/{n} ({c_hits / n:.0%}){'':>2} "
                f"{f_hits}/{n} ({f_hits / n:.0%})"
            )


if __name__ == "__main__":
    main()
