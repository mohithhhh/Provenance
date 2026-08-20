"""Lazily-loaded language models for Module B (zero-shot statistical
detector).

Two small, same-family causal LMs, matching the Binoculars approach's
requirement of a shared tokenizer between the model pair:

- **Performer** (`gpt2`, 124M params) — the model whose perplexity of the
  actual text is measured.
- **Observer** (`distilgpt2`, 82M params, distilled from `gpt2`) — the
  second model used to compute cross-perplexity against the performer's
  predictions.

These are real, general-purpose, publicly released base language models —
not fine-tuned for detection, not trained on any dataset assembled for
this project. Both are loaded lazily (first `/detect/statistical` call,
not app startup) and cached as module-level singletons, same pattern as
`app/embeddings.py`. First call on a fresh machine needs network access to
download the weights (~550MB + ~350MB); after that they're cached under
`~/.cache/huggingface` like the ledger's embedding model.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any

# transformers' type stubs don't cleanly cover from_pretrained()'s return
# type or .eval()/.generate() on the resulting model — Any is used
# deliberately here rather than fighting third-party stub gaps with a wall
# of type: ignore comments. Callers get real autocomplete/type info from
# transformers' own runtime objects; this module just doesn't re-declare it.

PERFORMER_MODEL_NAME = "gpt2"
OBSERVER_MODEL_NAME = "distilgpt2"


@lru_cache(maxsize=1)
def get_tokenizer() -> Any:
    """gpt2 and distilgpt2 share the same tokenizer/vocabulary — required
    for the cross-perplexity comparison between them to be meaningful at
    all (their next-token distributions must be over the same vocab)."""
    from transformers import AutoTokenizer

    return AutoTokenizer.from_pretrained(PERFORMER_MODEL_NAME)


@lru_cache(maxsize=1)
def get_performer_model() -> Any:
    from transformers import AutoModelForCausalLM

    model: Any = AutoModelForCausalLM.from_pretrained(PERFORMER_MODEL_NAME)
    model.eval()
    return model


@lru_cache(maxsize=1)
def get_observer_model() -> Any:
    from transformers import AutoModelForCausalLM

    model: Any = AutoModelForCausalLM.from_pretrained(OBSERVER_MODEL_NAME)
    model.eval()
    return model
