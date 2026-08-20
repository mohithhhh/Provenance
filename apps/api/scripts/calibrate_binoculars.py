#!/usr/bin/env python3
"""Produces the calibration numbers behind Module B's AI_THRESHOLD /
HUMAN_THRESHOLD in app/routers/detect.py and the table in
docs/architecture.md.

Human samples are original sentences written for this project (not scraped
from any corpus — consistent with this project's stated policy of never
bundling copyrighted or scraped text as demo data). AI samples are
generated live, right here, by the same gpt2 model Module B scores with —
the cleanest possible source of "genuinely machine-generated text" with no
licensing question at all.

This is a small, illustrative calibration set (16 samples), not a
statistically powered benchmark — that rigor is what Module C's Phase 5
HC3-based evaluation is for. This script exists so the threshold in
detect.py is *based on something measured*, not a guess, and so it's
reproducible rather than a one-off finding.

Usage: python scripts/calibrate_binoculars.py (from apps/api, venv active)
"""

from __future__ import annotations

import torch

from app.detectors.models import get_performer_model, get_tokenizer
from app.detectors.perplexity import analyze_text

# Original sentences written for this project — deliberately varied topics
# and structure, ordinary declarative prose (not famous quotes/pangrams,
# which small LMs tend to have memorized and score anomalously low).
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


def generate_ai_samples() -> list[str]:
    tokenizer = get_tokenizer()
    model = get_performer_model()
    torch.manual_seed(0)  # reproducible generations
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
        samples.append(tokenizer.decode(output[0], skip_special_tokens=True))
    return samples


def main() -> None:
    ai_samples = generate_ai_samples()

    human_scores = [analyze_text(s).binoculars_score for s in HUMAN_SAMPLES]
    ai_scores = [analyze_text(s).binoculars_score for s in ai_samples]

    print("## Human samples (original, written for this project)\n")
    for text, score in zip(HUMAN_SAMPLES, human_scores, strict=True):
        print(f"{score:.3f}  {text[:70]}")

    print("\n## AI samples (gpt2-generated, seed=0)\n")
    for text, score in zip(ai_samples, ai_scores, strict=True):
        print(f"{score:.3f}  {text[:70]!r}")

    print("\n## Summary\n")
    print(f"Human: min={min(human_scores):.3f} max={max(human_scores):.3f}")
    print(f"AI:    min={min(ai_scores):.3f} max={max(ai_scores):.3f}")
    gap_low, gap_high = max(ai_scores), min(human_scores)
    print(f"Gap: [{gap_low:.3f}, {gap_high:.3f}]")


if __name__ == "__main__":
    main()
