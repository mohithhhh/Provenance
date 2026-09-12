"""Module G's fourth attack: real paraphrasing via a small local T5 model —
an actual model rewriting meaning, not a structural word/sentence shuffle
(see attacks.py). Paraphrasing in general is the attack that defeats most
published AI-text detectors (see Module F's docs) — but measured here,
this specific small checkpoint turned out to be the *least* damaging of
this module's four attacks, not the most (see docs/benchmark.md and
docs/architecture.md for the full, honest reading of why).

`mrm8488/t5-small-finetuned-quora-for-paraphrasing` (T5-small) was picked
as the smallest known real fine-tuned paraphrase checkpoint on Hugging
Face — measured at ~440MB downloaded (larger than a bare T5-small's ~240MB
parameter count would suggest, since this checkpoint stores an untied
`lm_head` alongside the shared embedding table — see the "tied weights"
warning `get_model()` logs), at the cost of paraphrase quality lower than
the T5-base-sized alternatives the wider community more commonly uses. It
was also fine-tuned specifically on Quora question-pairs: it makes small,
conservative edits on declarative sentences — sometimes none at all — and
does its best rewriting on question-shaped input.

This attack needs real network access (or an already-populated local
cache) and ~440MB of free disk the first time it runs, unlike every other
attack in this module, which is why it's the one attack type this class of
error is worth handling explicitly rather than letting a raw exception
escape to the caller.
"""

from __future__ import annotations

from collections.abc import Callable
from functools import lru_cache
from typing import Any

MODEL_NAME = "mrm8488/t5-small-finetuned-quora-for-paraphrasing"


class ParaphraserUnavailable(RuntimeError):
    """Raised when the T5 paraphrase model can't be loaded: no local cache,
    and the download failed (no network access, or insufficient disk
    space for the ~440MB it needs). Not a bug in this attack — it's fully
    implemented and works the moment the model is available; see
    docs/limitations.md."""


def _load_or_raise(load: Callable[[], Any], what: str) -> Any:
    try:
        return load()
    except OSError as err:
        raise ParaphraserUnavailable(
            f"Couldn't load {what} ({MODEL_NAME}, ~440MB) — no local cache, "
            "and the download failed (no network access, or insufficient "
            "disk space). See docs/limitations.md."
        ) from err


@lru_cache(maxsize=1)
def get_tokenizer() -> Any:
    def load() -> Any:
        from transformers import T5Tokenizer

        return T5Tokenizer.from_pretrained(MODEL_NAME)

    return _load_or_raise(load, "the paraphrase tokenizer")


@lru_cache(maxsize=1)
def get_model() -> Any:
    def load() -> Any:
        from transformers import T5ForConditionalGeneration

        model: Any = T5ForConditionalGeneration.from_pretrained(MODEL_NAME)
        model.eval()
        return model

    return _load_or_raise(load, "the paraphrase model")


def paraphrase(text: str) -> str:
    """Raises ParaphraserUnavailable if the model can't be loaded."""
    import torch

    tokenizer = get_tokenizer()
    model = get_model()
    input_ids = tokenizer(f"paraphrase: {text}", return_tensors="pt", truncation=True).input_ids
    with torch.no_grad():
        output_ids = model.generate(input_ids, max_length=256, num_beams=4)
    return str(tokenizer.decode(output_ids[0], skip_special_tokens=True))
