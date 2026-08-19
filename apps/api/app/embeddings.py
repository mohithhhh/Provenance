"""Semantic text embeddings for Module F (retrieval provenance ledger).

Uses fastembed (ONNX Runtime) rather than sentence-transformers/PyTorch —
the same real, general-purpose semantic embedding quality (BAAI/bge-small-
en-v1.5, 384 dims), for a fraction of the disk footprint. That tradeoff
matters here specifically because this is a from-scratch portfolio project
built under real local disk constraints, not because ONNX is categorically
better than torch.

The model is loaded lazily and cached as a module-level singleton, so
importing this module (or starting the API) doesn't pay the load cost —
only the first actual embedding call does. First call on a machine with no
local model cache also needs network access to download the model
(~130MB) from Hugging Face; after that it's cached under
`~/.cache/huggingface` and loads in well under a second.
"""

from __future__ import annotations

from functools import lru_cache

import numpy as np

MODEL_NAME = "BAAI/bge-small-en-v1.5"
EMBEDDING_DIM = 384


@lru_cache(maxsize=1)
def _model() -> object:
    from fastembed import TextEmbedding

    return TextEmbedding(model_name=MODEL_NAME)


def embed(text: str) -> np.ndarray:
    """Embed a single string, returning a (384,) float32 vector."""
    (vector,) = _model().embed([text])  # type: ignore[attr-defined]
    return np.asarray(vector, dtype=np.float32)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0.0:
        return 0.0
    return float(np.dot(a, b) / denom)
